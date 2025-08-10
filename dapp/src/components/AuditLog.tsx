import { useEffect, useState } from 'react'
import { config } from '../config/wallet'
import { ABI, CONTRACT_ADDRESS } from '../config/contract'
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../config/registry'
import { getLogs, readContract } from '@wagmi/core'

type Row = { ts?: number, blockNumber: bigint, name: string, desc: string }

export function AuditLog() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [genesis, uriUpd, hashSet, forks] = await Promise.all([
        getLogs(config, {
          address: CONTRACT_ADDRESS,
          event: {
            type:'event', name:'GenesisCreated',
            inputs: [
              { indexed: true, name:'tokenId', type:'uint256' },
              { indexed: true, name:'author', type:'address' },
              { indexed: false, name:'tokenURI', type:'string' },
            ]
          } as any,
          fromBlock: 0n, toBlock: 'latest'
        }),
        getLogs(config, {
          address: CONTRACT_ADDRESS,
          event: {
            type:'event', name:'TokenURIUpdated',
            inputs: [
              { indexed: true, name:'tokenId', type:'uint256' },
              { indexed: false, name:'newTokenURI', type:'string' },
            ]
          } as any,
          fromBlock: 0n, toBlock: 'latest'
        }),
        getLogs(config, {
          address: CONTRACT_ADDRESS,
          event: {
            type:'event', name:'ContentHashSet',
            inputs: [
              { indexed: true, name:'tokenId', type:'uint256' },
              { indexed: false, name:'contentHash', type:'bytes32' },
            ]
          } as any,
          fromBlock: 0n, toBlock: 'latest'
        }),
        getLogs(config, {
          address: REGISTRY_ADDRESS,
          event: {
            type:'event', name:'ForkRegistered',
            inputs: [
              { indexed: true, name:'parentTokenId', type:'uint256' },
              { indexed: true, name:'childTokenId', type:'uint256' },
              { indexed: true, name:'caller', type:'address' },
            ]
          } as any,
          fromBlock: 0n, toBlock: 'latest'
        }),
      ])

      const list: Row[] = []
      for (const l of genesis) list.push({ blockNumber: l.blockNumber!, name: 'GenesisCreated', desc: `#${l.args.tokenId} by ${l.args.author}` })
      for (const l of uriUpd) list.push({ blockNumber: l.blockNumber!, name: 'TokenURIUpdated', desc: `#${l.args.tokenId}` })
      for (const l of hashSet) list.push({ blockNumber: l.blockNumber!, name: 'ContentHashSet', desc: `#${l.args.tokenId}` })
      for (const l of forks) list.push({ blockNumber: l.blockNumber!, name: 'ForkRegistered', desc: `#${l.args.parentTokenId} → #${l.args.childTokenId}` })

      list.sort((a,b) => (a.blockNumber < b.blockNumber ? -1 : 1))
      setRows(list.reverse())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <section className="space-y-3 border rounded p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold">Audit Log</div>
        <button className="px-3 py-1 border rounded" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>
      </div>
      <div className="text-xs opacity-70">Aggregates on-chain events: GenesisCreated, TokenURIUpdated, ContentHashSet, ForkRegistered.</div>
      <div className="max-h-[420px] overflow-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left opacity-70"><th className="p-2">Block</th><th className="p-2">Event</th><th className="p-2">Details</th></tr></thead>
          <tbody>
            {rows.map((r,i)=>(
              <tr key={i} className="border-t"><td className="p-2 font-mono">{String(r.blockNumber)}</td><td className="p-2">{r.name}</td><td className="p-2">{r.desc}</td></tr>
            ))}
            {rows.length === 0 && !loading && (<tr><td className="p-2" colSpan={3}>No events yet.</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  )
}
