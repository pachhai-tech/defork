import * as React from "react";
import { useAccount, useChainId } from "wagmi";
import {
  CONTRACT_ADDRESS,
  REGISTRY_ADDRESS,
  VOTING_POOL_ADDRESS,
  ROYALTY_MANAGER_ADDRESS
} from "../config/contract";

export function About({ onClose }: { onClose: () => void }) {
  const chainId = useChainId();
  const { address, isConnected } = useAccount();

  const info = {
    version: import.meta.env.VITE_APP_VERSION || "dev",
    commit: import.meta.env.VITE_BUILD_COMMIT || "dev",
    buildTime: import.meta.env.VITE_BUILD_TIME || "unknown",
    env: {
      VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
      VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
      VITE_NFT_ADDRESS: import.meta.env.VITE_NFT_ADDRESS,
      VITE_REGISTRY_ADDRESS: import.meta.env.VITE_REGISTRY_ADDRESS,
      VITE_VOTING_POOL_ADDRESS: import.meta.env.VITE_VOTING_POOL_ADDRESS,
      VITE_ROYALTY_MANAGER_ADDRESS: import.meta.env
        .VITE_ROYALTY_MANAGER_ADDRESS,
      VITE_USDC_ADDRESS: import.meta.env.VITE_USDC_ADDRESS,
      VITE_WETH_ADDRESS: import.meta.env.VITE_WETH_ADDRESS
    },
    runtime: {
      connected: isConnected,
      address,
      detectedChainId: chainId,
      userAgent: navigator.userAgent
    },
    addresses: {
      nftContract: CONTRACT_ADDRESS,
      registry: REGISTRY_ADDRESS,
      votingPool: VOTING_POOL_ADDRESS,
      royaltyManager: ROYALTY_MANAGER_ADDRESS
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 70,
        display: "grid",
        placeItems: "center"
      }}
    >
      <div className="bg-white border rounded shadow max-w-2xl w-[92%] p-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">About this build</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
          <section className="space-y-1">
            <div className="font-medium">Build Info</div>
            <div>
              <span className="opacity-60">Version:</span>{" "}
              <span className="font-mono">{String(info.version)}</span>
            </div>
            <div>
              <span className="opacity-60">Commit:</span>{" "}
              <span className="font-mono">
                {String(info.commit).slice(0, 7)}
              </span>
            </div>
            <div>
              <span className="opacity-60">Built:</span>{" "}
              <span className="font-mono">{String(info.buildTime)}</span>
            </div>
          </section>
          <section className="space-y-1">
            <div className="font-medium">Runtime</div>
            <div>
              <span className="opacity-60">Connected:</span>{" "}
              {info.runtime.connected ? "Yes" : "No"}
            </div>
            <div>
              <span className="opacity-60">Address:</span>{" "}
              <span className="font-mono break-all">
                {info.runtime.address || "None"}
              </span>
            </div>
            <div>
              <span className="opacity-60">Chain ID:</span>{" "}
              <span className="font-mono">
                {String(info.runtime.detectedChainId || "")}
              </span>
            </div>
          </section>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-2">Contract Addresses</div>
          <div className="grid gap-1 text-xs">
            <div>
              <span className="opacity-60">NFT Contract:</span>{" "}
              <span className="font-mono break-all">
                {info.addresses.nftContract}
              </span>
            </div>
            <div>
              <span className="opacity-60">Registry:</span>{" "}
              <span className="font-mono break-all">
                {info.addresses.registry}
              </span>
            </div>
            <div>
              <span className="opacity-60">Voting Pool:</span>{" "}
              <span className="font-mono break-all">
                {info.addresses.votingPool}
              </span>
            </div>
            <div>
              <span className="opacity-60">Royalty Manager:</span>{" "}
              <span className="font-mono break-all">
                {info.addresses.royaltyManager}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="font-medium mb-2">Network Configuration</div>
          <div className="grid gap-1 text-xs">
            <div>
              <span className="opacity-60">Env Chain ID:</span>{" "}
              <span className="font-mono">
                {String(info.env.VITE_CHAIN_ID || "")}
              </span>
            </div>
            <div>
              <span className="opacity-60">RPC URL:</span>{" "}
              <span className="font-mono break-all">
                {String(info.env.VITE_RPC_URL || "")}
              </span>
            </div>
          </div>
        </div>

        <details className="mt-3">
          <summary className="cursor-pointer font-medium">
            Full Environment Snapshot
          </summary>
          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto text-xs max-h-40">
            {JSON.stringify(info.env, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}
