import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { REGISTRY_ADDRESS } from "../config/registry";
import {
  isAddress,
  getAddress,
  defineChain,
  createPublicClient,
  http
} from "viem";

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

      // 5) W3UP storage (browser) – space connected?
      try {
        const Storacha = await import("@storacha/client");
        const client = await Storacha.create();
        const spaces = await client.spaces();
        if (spaces.length > 0) {
          await client.setCurrentSpace(spaces[0].did());
          list.push({
            label: "Storacha storage connected",
            ok: true,
            detail: spaces[0].did()
          });
        } else {
          list.push({
            label: "Storacha storage connected",
            ok: false,
            detail: "no space; click “Connect storage”"
          });
        }
      } catch (e: any) {
        list.push({
          label: "Storacha storage connected",
          ok: false,
          detail: e?.message || "init failed"
        });
      }

      // 6) Registry address sanity
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
        Tip: use the header **Connect storage** button to complete W3UP login
        (magic link).
      </div>
    </section>
  );
}
