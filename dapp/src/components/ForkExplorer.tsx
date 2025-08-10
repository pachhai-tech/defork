import { useEffect, useMemo, useState } from "react";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { REGISTRY_ABI, REGISTRY_ADDRESS } from "../config/registry";
import {
  createPublicClient,
  defineChain,
  http,
  decodeEventLog,
  type Log
} from "viem";
import { ipfsToHttp } from "../lib/ipfs";

type Node = { id: number; children: number[] };

export function ForkExplorer() {
  const [edges, setEdges] = useState<{ parent: number; child: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      // 1) totalSupply to bound loop/fallback
      const t = (await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "totalSupply"
      })) as bigint;
      setTotal(Number(t));

      // 2) Fetch ForkRegistered logs via a viem public client
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

      const latest = await client.getBlockNumber();
      const span = 50_000n;
      const fromBlock = latest > span ? latest - span : 0n;

      const logs = await client.getLogs({
        address: REGISTRY_ADDRESS,
        fromBlock,
        toBlock: latest
      });

      let es = [] as { parent: number; child: number }[];
      for (const log of logs as Log[]) {
        try {
          const dec = decodeEventLog({
            abi: REGISTRY_ABI,
            data: log.data,
            topics: log.topics
          });
          if (dec.eventName === "ForkRegistered") {
            const parent = Number(dec.args.parentTokenId as bigint);
            const child = Number(dec.args.childTokenId as bigint);
            es.push({ parent, child });
          }
        } catch {
          // ignore non-matching events
        }
      }

      // 3) Fallback: traverse metadata to detect parentTokenId relationships
      if (es.length === 0) {
        try {
          const out: { parent: number; child: number }[] = [];
          for (let id = 1; id <= Number(t); id++) {
            const uri = (await readContract(config, {
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "tokenURI",
              args: [BigInt(id)]
            })) as string;
            const res = await fetch(ipfsToHttp(uri));
            const meta = await res.json();
            const p = Number(meta?.parentTokenId || 0);
            if (p && p > 0) out.push({ parent: p, child: id });
          }
          if (out.length > 0) es = out;
        } catch (e) {
          console.warn("metadata fallback failed", e);
        }
      }

      setEdges(es);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const graph = useMemo(() => {
    const kids: Record<number, number[]> = {};
    const seenChild = new Set<number>();
    for (const e of edges) {
      if (!kids[e.parent]) kids[e.parent] = [];
      kids[e.parent].push(e.child);
      seenChild.add(e.child);
    }
    const roots: number[] = [];
    for (let i = 1; i <= total; i++) {
      if (!seenChild.has(i)) roots.push(i);
    }
    return { kids, roots };
  }, [edges, total]);

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Fork Explorer</h2>
      <div className="flex items-center gap-3 text-sm opacity-70">
        <span>
          Tokens: {total} • Edges: {edges.length}
        </span>
        <button
          className="px-2 py-1 border rounded opacity-100"
          onClick={() => load()}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Manual refresh"}
        </button>
      </div>
      {graph.roots.length === 0 ? (
        <div className="opacity-70">No items yet.</div>
      ) : (
        <div className="space-y-2">
          {graph.roots.map((root) => (
            <Tree key={root} id={root} kids={graph.kids} depth={0} />
          ))}
        </div>
      )}
    </section>
  );
}

function Tree({
  id,
  kids,
  depth
}: {
  id: number;
  kids: Record<number, number[]>;
  depth: number;
}) {
  const children = kids[id] || [];
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2">
        <div className="font-mono">#{id}</div>
        {children.length > 0 && (
          <span className="text-xs opacity-60">({children.length} forks)</span>
        )}
      </div>
      {children.map((c) => (
        <Tree key={c} id={c} kids={kids} depth={depth + 1} />
      ))}
    </div>
  );
}
