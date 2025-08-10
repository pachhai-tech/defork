import { useEffect, useMemo, useState } from 'react'
import { REGISTRY_ABI, REGISTRY_ADDRESS } from '../config/registry'
import { ABI, CONTRACT_ADDRESS } from '../config/contract'
import { readContract } from '@wagmi/core'
import { config } from '../config/wallet'
import { type Address } from 'viem'

type Node = { id: number, children: number[] }

export function ForkExplorer() {
  const [edges, setEdges] = useState<{ parent: number, child: number }[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)

  async function load() {
      setLoading(true)
      try {
        // read totalSupply to bound the set
        const t = await readContract(config, { address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalSupply' }) as bigint
        setTotal(Number(t))

        // pull all ForkRegistered logs (simple client indexer)
        const { getLogs } = await import('@wagmi/core')
        const logs = await getLogs(config, {
          address: REGISTRY_ADDRESS as Address,
          event: {
            type: 'event',
            name: 'ForkRegistered',
            inputs: [
              { indexed: true, name: 'parentTokenId', type: 'uint256' },
              { indexed: true, name: 'childTokenId', type: 'uint256' },
              { indexed: true, name: 'caller', type: 'address' },
            ]
          } as any,
          fromBlock: 0n,
          toBlock: 'latest'
        })
        let es = logs.map((l:any) => ({
          parent: Number(l.args.parentTokenId),
          child: Number(l.args.childTokenId)
        }))
        // Fallback: derive edges from token metadata if graph is sparse
        if (es.length === 0) {
          try {
            const out: {parent:number, child:number}[] = []
            for (let id = 1; id <= Number(t); id++) {
              const uri = await readContract(config, { address: CONTRACT_ADDRESS, abi: ABI, functionName: 'tokenURI', args: [BigInt(id)] }) as string
              const http = uri.replace('ipfs://','https://ipfs.io/ipfs/')
              const meta = await (await fetch(http)).json()
              const p = Number(meta?.parentTokenId || 0)
              if (p && p > 0) out.push({ parent: p, child: id })
            }
            if (out.length > 0) es = out
          } catch (e) { console.warn('metadata fallback failed', e) }
        }
        setEdges(es)
      } catch (e) {
        console.error(e)
      } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])
  useEffect(() => {
    const h = () => load()
    window.addEventListener('fork-graph-refresh', h)
    return () => window.removeEventListener('fork-graph-refresh', h)
  }, [])

  // Build adjacency from edges
  const graph = useMemo(() => {
    const kids: Record<number, number[]> = {}
    const seenChild = new Set<number>()
    edges.forEach(({parent, child}) => {
      if (!kids[parent]) kids[parent] = []
      kids[parent].push(child)
      seenChild.add(child)
    })
    // roots: tokens that are not children (or parent=0)
    const roots: number[] = []
    for (let i=1;i<=total;i++){
      if (!seenChild.has(i)) roots.push(i)
    }
    return { kids, roots }
  }, [edges, total])

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">Fork Explorer</h2>
      <div className="flex items-center gap-3 text-sm opacity-70">
        <span>Tokens: {total} • Edges: {edges.length}</span>
        <button className="px-2 py-1 border rounded opacity-100" onClick={()=>load()} disabled={loading}>
          {loading ? 'Refreshing…' : 'Manual refresh'}
        </button>
      </div>
      {graph.roots.length === 0 ? <div className="opacity-70">No items yet.</div> :
        <div className="space-y-2">
          {graph.roots.map((root) => (
            <Tree key={root} id={root} kids={graph.kids} depth={0} />
          ))}
        </div>
      }
    </section>
  )
}

function Tree({ id, kids, depth }: { id: number, kids: Record<number, number[]>, depth: number }) {
  const children = kids[id] || []
  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div className="flex items-center gap-2">
        <div className="font-mono">#{id}</div>
        {children.length > 0 && <span className="text-xs opacity-60">({children.length} forks)</span>}
      </div>
      {children.map((c) => <Tree key={c} id={c} kids={kids} depth={depth+1} />)}
    </div>
  )
}
