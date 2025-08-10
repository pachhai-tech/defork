import * as React from 'react'
import { useAccount, useChainId } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config/contract'
import { REGISTRY_ADDRESS } from '../config/registry'

export function About({ onClose }: { onClose: () => void }) {
  const chainId = useChainId()
  const { address, isConnected } = useAccount()

  const info = {
    version: import.meta.env.VITE_APP_VERSION || 'dev',
    commit: import.meta.env.VITE_BUILD_COMMIT || 'dev',
    buildTime: import.meta.env.VITE_BUILD_TIME || 'unknown',
    env: {
      VITE_CHAIN_ID: import.meta.env.VITE_CHAIN_ID,
      VITE_RPC_URL: import.meta.env.VITE_RPC_URL,
      VITE_CONTRACT_ADDRESS: import.meta.env.VITE_CONTRACT_ADDRESS,
      VITE_REGISTRY_ADDRESS: import.meta.env.VITE_REGISTRY_ADDRESS
    },
    runtime: {
      connected: isConnected,
      address,
      detectedChainId: chainId,
      userAgent: navigator.userAgent
    },
    addresses: {
      contract: CONTRACT_ADDRESS,
      registry: REGISTRY_ADDRESS
    }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:70,display:'grid',placeItems:'center'}}>
      <div className="bg-white border rounded shadow max-w-xl w-[92%] p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">About this build</h3>
          <button className="px-2 py-1 border rounded" onClick={onClose}>Close</button>
        </div>
        <div className="grid md:grid-cols-2 gap-3 mt-3 text-sm">
          <section className="space-y-1">
            <div><span className="opacity-60">Version:</span> <span className="font-mono">{String(info.version)}</span></div>
            <div><span className="opacity-60">Commit:</span> <span className="font-mono">{String(info.commit).slice(0,7)}</span></div>
            <div><span className="opacity-60">Built:</span> <span className="font-mono">{String(info.buildTime)}</span></div>
            <div><span className="opacity-60">User agent:</span> <span className="font-mono break-all">{info.runtime.userAgent}</span></div>
          </section>
          <section className="space-y-1">
            <div className="font-medium">Addresses</div>
            <div className="font-mono break-all">Contract: {info.addresses.contract}</div>
            <div className="font-mono break-all">Registry: {info.addresses.registry}</div>
            <div className="font-medium mt-2">Network</div>
            <div>Env chainId: <span className="font-mono">{String(info.env.VITE_CHAIN_ID || '')}</span></div>
            <div>Wallet chainId: <span className="font-mono">{String(info.runtime.detectedChainId || '')}</span></div>
            <div>RPC: <span className="font-mono break-all">{String(info.env.VITE_RPC_URL || '')}</span></div>
          </section>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer">Env snapshot</summary>
          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto text-xs">{JSON.stringify(info.env, null, 2)}</pre>
        </details>
        <details className="mt-2">
          <summary className="cursor-pointer">Runtime snapshot</summary>
          <pre className="mt-2 bg-gray-50 p-2 rounded overflow-auto text-xs">{JSON.stringify(info.runtime, null, 2)}</pre>
        </details>
      </div>
    </div>
  )
}
