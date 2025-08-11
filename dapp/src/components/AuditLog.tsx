import { useEffect, useState } from "react";
import {
  createPublicClient,
  defineChain,
  http,
  decodeEventLog,
  type Log
} from "viem";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { ipfsToHttp } from "../lib/ipfs";

type Decoded = {
  blockNumber: bigint;
  txHash: `0x${string}`;
  eventName: string;
  args: Record<string, unknown>;
};

export function AuditLog() {
  const [rows, setRows] = useState<Decoded[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        // Build a viem client from your Vite env (no wagmi dependency here)
        const chain = defineChain({
          id: Number(import.meta.env.VITE_CHAIN_ID || 0),
          name: "Configured",
          nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 },
          rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL || ""] } }
        });
        const client = createPublicClient({
          chain,
          transport: http(import.meta.env.VITE_RPC_URL || "")
        });

        // Pull recent logs to avoid huge scans
        const latest = await client.getBlockNumber();
        const span = 10_000n;
        const fromBlock = latest > span ? latest - span : 0n;

        const logs = await client.getLogs({
          address: CONTRACT_ADDRESS,
          fromBlock,
          toBlock: latest
        });

        const decoded: Decoded[] = [];
        for (const log of logs as Log[]) {
          try {
            const d = decodeEventLog({
              abi: ABI,
              data: log.data,
              topics: log.topics
            });
            decoded.push({
              blockNumber: log.blockNumber!,
              txHash: log.transactionHash!,
              eventName: d.eventName,
              args: (d.args || {}) as any
            });
          } catch {
            // Not one of our ABI events — ignore
          }
        }

        // newest first
        decoded.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));
        setRows(decoded.slice(0, 100));
      } catch (e: any) {
        setErr(e?.message || String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const formatArgs = (args: Record<string, unknown>) => {
    const formatted: Record<string, string> = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === "bigint") {
        formatted[key] = value.toString();
      } else if (typeof value === "string" && value.startsWith("0x")) {
        // Truncate long hex values
        formatted[key] =
          value.length > 10
            ? `${value.slice(0, 6)}...${value.slice(-4)}`
            : value;
      } else {
        formatted[key] = String(value);
      }
    }
    return formatted;
  };

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Contract Activity</h2>
      {loading && <div className="opacity-70 text-sm">Loading logs…</div>}
      {err && <div className="text-sm text-red-600">{err}</div>}
      {!loading && !err && rows.length === 0 && (
        <div className="opacity-70 text-sm">No recent events.</div>
      )}
      <div className="grid gap-2 max-h-96 overflow-y-auto">
        {rows.map((r, i) => (
          <div key={`${r.txHash}-${i}`} className="border rounded p-2 text-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="font-medium">{r.eventName}</div>
              <div className="text-xs opacity-50">
                Block {r.blockNumber.toString()}
              </div>
            </div>
            <div className="opacity-70 break-all mb-2">
              tx:{" "}
              <a
                href={`https://hashscan.io/testnet/transaction/${r.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {r.txHash}
              </a>
            </div>
            <pre className="bg-gray-50 p-2 rounded overflow-auto text-xs">
              {JSON.stringify(formatArgs(r.args), null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}
