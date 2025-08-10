import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { ABI, CONTRACT_ADDRESS } from '../config/contract'
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../config/registry'
import { readContract } from '@wagmi/core'
import { config } from '../config/wallet'

type Check = { label: string, ok: boolean | null, detail?: string }

export function QuickstartChecklist() {
  const { address, isConnected } = useAccount()
  const [checks, setChecks] = useState<Check[]>([])

  useEffect(() => {
    async function run() {
      const list: Check[] = []

      // .env vars
      const vars = [
        'VITE_CHAIN_ID','VITE_RPC_URL','VITE_CONTRACT_ADDRESS','VITE_REGISTRY_ADDRESS','VITE_WEB3STORAGE_TOKEN','VITE_WALLETCONNECT_PROJECT_ID'
      ]
      for (const v of vars) {
        list.push({ label: `.env: ${v}`, ok: !!import.meta.env[v] })
      }

      // contract reachable?
      try {
        await readContract(config, { address: CONTRACT_ADDRESS, abi: ABI, functionName: 'owner' })
        list.push({ label: 'Contract reachable', ok: true })
      } catch (e) {
        list.push({ label: 'Contract reachable', ok: false, detail: String(e) })
      }

      // wallet
      list.push({ label: 'Wallet connected', ok: isConnected })

      // IPFS token test
      try {
        const r = await fetch('https://api.web3.storage/user/uploads', { headers: { Authorization: `Bearer ${import.meta.env.VITE_WEB3STORAGE_TOKEN}` } })
        list.push({ label: 'Web3.Storage token valid', ok: r.ok })
      } catch (e) {
        list.push({ label: 'Web3.Storage token valid', ok: false, detail: String(e) })
      }

      setChecks(list)
    }
    run()
  }, [isConnected])

  if (!checks.length) return null

  return (
    <section className="border rounded p-4 bg-white shadow space-y-2">
      <div className="font-semibold">Quickstart Checklist</div>
      <ul className="text-sm">
        {checks.map((c,i)=>(
          <li key={i} className="flex items-center gap-2">
            <span>{c.ok ? '✅' : c.ok === false ? '❌' : '…'}</span>
            <span>{c.label}</span>
            {c.detail && <span className="text-xs opacity-60">{c.detail}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
