import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";

export function Quickstart() {
  const { isConnected } = useAccount();
  const [rpcOk, setRpcOk] = useState<boolean | null>(null);
  const [storageOk, setStorageOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      // RPC probe
      try {
        const { defineChain, createPublicClient, http } = await import("viem");
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
        await client.getBlockNumber();
        setRpcOk(true);
      } catch {
        setRpcOk(false);
      }

      // Storage
      try {
        const Storacha = await import("@storacha/client");
        const client = await Storacha.create();
        const spaces = await client.spaces();
        setStorageOk(spaces.length > 0);
      } catch {
        setStorageOk(false);
      }
    })();
  }, []);

  const envOk =
    !!import.meta.env.VITE_CHAIN_ID &&
    !!import.meta.env.VITE_RPC_URL &&
    isAddress(import.meta.env.VITE_CONTRACT_ADDRESS) &&
    isAddress(import.meta.env.VITE_REGISTRY_ADDRESS);

  return (
    <div className="rounded border p-4 bg-white shadow text-sm space-y-1">
      <div>Env: {envOk ? "✔" : "✖"}</div>
      <div>Wallet: {isConnected ? "✔" : "✖"}</div>
      <div>RPC: {rpcOk === null ? "…" : rpcOk ? "✔" : "✖"}</div>
      <div>
        Storage (W3UP): {storageOk === null ? "…" : storageOk ? "✔" : "✖"}
      </div>
    </div>
  );
}
