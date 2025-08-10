import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { REGISTRY_ADDRESS } from "../config/registry";
import { isAddress, getAddress } from "viem";

type Check = { label: string; ok: boolean | null; detail?: string };

export function QuickstartChecklist() {
  const { address, isConnected } = useAccount();
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list: Check[] = [];

      // 1) .env vars
      const env = {
        chainId: import.meta.env.VITE_CHAIN_ID,
        rpc: import.meta.env.VITE_RPC_URL,
        nft: import.meta.env.VITE_CONTRACT_ADDRESS,
        reg: import.meta.env.VITE_REGISTRY_ADDRESS,
        nftstorage: import.meta.env.VITE_NFTSTORAGE_TOKEN,
        wc: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID
      };
      list.push({
        label: ".env: VITE_CHAIN_ID",
        ok: !!env.chainId,
        detail: String(env.chainId || "")
      });
      list.push({
        label: ".env: VITE_RPC_URL",
        ok: !!env.rpc,
        detail: env.rpc || ""
      });
      list.push({
        label: ".env: VITE_CONTRACT_ADDRESS",
        ok: !!env.nft && isAddress(env.nft),
        detail: env.nft || ""
      });
      list.push({
        label: ".env: VITE_REGISTRY_ADDRESS",
        ok: !!env.reg && isAddress(env.reg),
        detail: env.reg || ""
      });
      list.push({
        label: ".env: VITE_NFTSTORAGE_TOKEN",
        ok: !!env.nftstorage,
        detail: env.nftstorage ? "present" : "missing"
      });
      list.push({
        label: ".env: VITE_WALLETCONNECT_PROJECT_ID",
        ok: !!env.wc,
        detail: env.wc ? "present" : "missing"
      });

      // 2) Wallet connection
      list.push({
        label: "Wallet connected",
        ok: isConnected,
        detail: isConnected ? String(address) : "not connected"
      });

      // 3) RPC reachability
      try {
        const { createPublicClient, http, defineChain } = await import("viem");
        const chain = defineChain({
          id: Number(env.chainId || 0),
          name: "Configured Chain",
          nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 },
          rpcUrls: { default: { http: [env.rpc || ""] } }
        });
        const client = createPublicClient({
          chain,
          transport: http(env.rpc || "")
        });
        const bn = await client.getBlockNumber();
        list.push({
          label: "RPC reachable",
          ok: typeof bn === "bigint",
          detail: typeof bn === "bigint" ? `block ${bn}` : "failed"
        });
      } catch (e: any) {
        list.push({
          label: "RPC reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      // 4) Contract callable: totalSupply()
      try {
        const ts = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "totalSupply"
        })) as bigint;
        list.push({
          label: "Contract reachable",
          ok: true,
          detail: `totalSupply=${ts.toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "Contract reachable",
          ok: false,
          detail: e?.shortMessage || e?.message || "read failed"
        });
      }

      // 5) Registry address sanity
      list.push({
        label: "Registry address format",
        ok: isAddress(REGISTRY_ADDRESS),
        detail: isAddress(REGISTRY_ADDRESS)
          ? getAddress(REGISTRY_ADDRESS)
          : "invalid"
      });

      setChecks(list);
      setLoading(false);
    })();
  }, [address, isConnected]);

  return (
    <section className="border rounded p-4 bg-white shadow space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Quickstart Checklist</div>
        <button
          className="px-3 py-1 border rounded text-sm"
          onClick={() => location.reload()}
        >
          {loading ? "Checking…" : "Re-run checks"}
        </button>
      </div>
      <ul className="text-sm space-y-1">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              className={
                c.ok
                  ? "text-green-600"
                  : c.ok === false
                  ? "text-red-600"
                  : "opacity-60"
              }
            >
              {c.ok ? "✔" : c.ok === false ? "✖" : "…"}
            </span>
            <span className="min-w-[220px]">{c.label}</span>
            {c.detail && (
              <span className="text-xs opacity-70 break-all">{c.detail}</span>
            )}
          </li>
        ))}
      </ul>
      <div className="text-xs opacity-60">
        Tip: edit <code>dapp/.env</code> and refresh. If the contract is
        deployed but unreachable, double-check chain ID, RPC URL, and address.
      </div>
    </section>
  );
}
