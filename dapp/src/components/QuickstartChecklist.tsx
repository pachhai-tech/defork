import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import {
  ABI,
  CONTRACT_ADDRESS,
  REGISTRY_ADDRESS,
  VOTING_POOL_ADDRESS
} from "../config/contract";
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
        nft: import.meta.env.VITE_NFT_ADDRESS,
        reg: import.meta.env.VITE_REGISTRY_ADDRESS,
        voting: import.meta.env.VITE_VOTING_POOL_ADDRESS,
        royalty: import.meta.env.VITE_ROYALTY_MANAGER_ADDRESS,
        usdc: import.meta.env.VITE_USDC_ADDRESS,
        weth: import.meta.env.VITE_WETH_ADDRESS,
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
        label: ".env: VITE_NFT_ADDRESS",
        ok: !!env.nft && isAddress(env.nft),
        detail: env.nft || ""
      });
      list.push({
        label: ".env: VITE_REGISTRY_ADDRESS",
        ok: !!env.reg && isAddress(env.reg),
        detail: env.reg || ""
      });
      list.push({
        label: ".env: VITE_VOTING_POOL_ADDRESS",
        ok: !!env.voting && isAddress(env.voting),
        detail: env.voting || ""
      });
      list.push({
        label: ".env: VITE_ROYALTY_MANAGER_ADDRESS",
        ok: !!env.royalty && isAddress(env.royalty),
        detail: env.royalty || ""
      });
      list.push({
        label: ".env: VITE_USDC_ADDRESS",
        ok: !!env.usdc && isAddress(env.usdc),
        detail: env.usdc || ""
      });
      list.push({
        label: ".env: VITE_WETH_ADDRESS",
        ok: !!env.weth && isAddress(env.weth),
        detail: env.weth || ""
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
          label: "NFT Contract reachable",
          ok: true,
          detail: `totalSupply=${ts.toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "NFT Contract reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      // 5) Registry contract check
      try {
        const parent = (await readContract(config, {
          address: REGISTRY_ADDRESS,
          abi: [
            {
              type: "function",
              name: "parentOf",
              stateMutability: "view",
              inputs: [{ name: "tokenId", type: "uint256" }],
              outputs: [{ type: "uint256" }]
            }
          ],
          functionName: "parentOf",
          args: [BigInt(1)]
        })) as bigint;
        list.push({
          label: "Registry Contract reachable",
          ok: true,
          detail: `parentOf(1)=${parent.toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "Registry Contract reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      // 6) Voting pool contract check
      try {
        const stats = (await readContract(config, {
          address: VOTING_POOL_ADDRESS,
          abi: [
            {
              type: "function",
              name: "getTokenStats",
              stateMutability: "view",
              inputs: [{ name: "tokenId", type: "uint256" }],
              outputs: [
                { name: "votes", type: "uint256" },
                { name: "totalValue", type: "uint256" }
              ]
            }
          ],
          functionName: "getTokenStats",
          args: [BigInt(1)]
        })) as [bigint, bigint];
        list.push({
          label: "Voting Pool Contract reachable",
          ok: true,
          detail: `token1 votes=${stats[0].toString()}`
        });
      } catch (e: any) {
        list.push({
          label: "Voting Pool Contract reachable",
          ok: false,
          detail: e?.message || "failed"
        });
      }

      setChecks(list);
      setLoading(false);
    })();
  }, [address, isConnected]);

  const allGood = checks.every((c) => c.ok === true);
  const hasErrors = checks.some((c) => c.ok === false);

  return (
    <section className="space-y-3 border rounded p-4">
      <div className="flex items-center gap-2">
        <div className="font-semibold">Quickstart Checklist</div>
        {loading ? (
          <div className="text-xs opacity-70">Checking...</div>
        ) : allGood ? (
          <div className="text-xs text-green-600 font-medium">
            ✅ All systems ready!
          </div>
        ) : hasErrors ? (
          <div className="text-xs text-red-600 font-medium">
            ⚠️ Issues detected
          </div>
        ) : (
          <div className="text-xs text-yellow-600 font-medium">
            ⏳ Partial setup
          </div>
        )}
      </div>

      <div className="grid gap-1 text-sm">
        {checks.map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs">
              {c.ok === true ? "✅" : c.ok === false ? "❌" : "⏳"}
            </span>
            <span className="min-w-0 flex-1 font-medium">{c.label}</span>
            <span className="text-xs opacity-70 break-all max-w-xs">
              {c.detail}
            </span>
          </div>
        ))}
      </div>

      {hasErrors && (
        <div className="text-xs opacity-70 pt-2 border-t">
          <div className="font-medium mb-1">Fix issues:</div>
          <div>• Update .env file with correct contract addresses</div>
          <div>• Ensure you're on the right network (check VITE_CHAIN_ID)</div>
          <div>• Deploy contracts if they don't exist</div>
          <div>• Check RPC endpoint connectivity</div>
        </div>
      )}

      {allGood && (
        <div className="text-xs opacity-70 pt-2 border-t">
          <div className="font-medium mb-1">🎉 Ready to go!</div>
          <div>• Connect your wallet above</div>
          <div>• Create your first NFT content</div>
          <div>• Explore the fork tree and voting system</div>
        </div>
      )}
    </section>
  );
}
