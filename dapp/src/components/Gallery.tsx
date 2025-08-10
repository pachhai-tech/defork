import { useEffect, useState } from 'react'
import { readContract } from '@wagmi/core'
import { config } from '../config/wallet'
import { ABI, CONTRACT_ADDRESS } from '../config/contract'
import { ipfsToHttp } from '../lib/ipfs'
import { explorerFor } from '../lib/chain'
import { useChainId } from 'wagmi'
import { CONTRACT_ADDRESS } from '../config/contract'

type Meta = {
  name: string
  description?: string
  image?: string
  contentType: string
  contributionType: string
  model?: { id: string, version: string } | null
  contentHash?: string
}

export function Gallery() {
  const [items, setItems] = useState<{ id: number, meta: Meta }[]>([])
  const [showHidden, setShowHidden] = useState(false)
  const [txMap, setTxMap] = useState<Record<string,string>>({})
  const [txInfoMap, setTxInfoMap] = useState<Record<string,{txHash:string, txMetaUri?:string}>>({})
  const chainId = useChainId()
  const exp = explorerFor(chainId)
  const txs = JSON.parse(localStorage.getItem('mintTxs') || '[]')
  useEffect(() => { (async () => {
    try {
      const total = Number(await readContract(config, { address: CONTRACT_ADDRESS, abi: ABI, functionName: 'totalSupply' }))
      const out: any[] = []
      for (let id = 1; id <= total; id++) {
        const uri = await readContract(config, { address: CONTRACT_ADDRESS, abi: ABI, functionName: 'tokenURI', args: [BigInt(id)] }) as string
        const res = await fetch(ipfsToHttp(uri)); const meta = await res.json()
        out.push({ id, meta })
      }
      setItems(out.reverse())
      try { setTxMap(JSON.parse(localStorage.getItem('mintTxByTokenId') || '{}')) } catch {}
      try { setTxInfoMap(JSON.parse(localStorage.getItem('mintInfoByTokenId') || '{}')) } catch {}
    } catch (e) { console.error(e) }
  })() }, [])

  return (
    <section className="space-y-4">
      <h2 className="font-semibold text-lg">Gallery</h2>
      <div className="flex items-center gap-2">
        <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={showHidden} onChange={e=>setShowHidden(e.target.checked)} />Show hidden</label>
      </div>
      <div className="grid gap-4">
        {items.filter(({meta}) => showHidden || !(meta as any)?.moderation?.hidden).map(({ id, meta }) => (
          <article key={id} className="border rounded p-3">
            <h3 className="font-semibold">{meta.name} <span className="opacity-60">#{id}</span></h3>
            {meta.image && (
              <img className="mt-2 rounded" src={ipfsToHttp(meta.image)} />
            )}
            {meta.contentType?.startsWith('text/') && (
              <p className="mt-2 text-sm opacity-80">{meta.description || '(text item)'}</p>
            )}
            <div className="mt-2 text-xs opacity-70">
              <div>Type: {meta.contentType} | {meta.contributionType}</div>
              {meta.model?.id && <div>Model: {meta.model.id}</div>}
              {meta.contentHash && <div>SHA-256: {meta.contentHash.slice(0,12)}…</div>}
            </div>
            <div className="flex gap-3 mt-2">
              <button className="text-xs underline" onClick={()=>{
                const key='draftCreateForm'
                const draft = { parentTokenId: String(id), title: `Fork of #${id}` }
                localStorage.setItem(key, JSON.stringify(draft))
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}>Fork</button>
              <button className="text-xs underline" onClick={async()=>{
                const body = { tokenId: id, reason: 'user-report', ts: Math.floor(Date.now()/1000) }
                const blob = new Blob([JSON.stringify(body)], {type:'application/json'})
                const { putFile } = await import('../lib/ipfs')
                const uri = await putFile(blob, `report_${id}.json`)
                alert(`Report stored: ${uri}`)
              }}>Report</button>
            </div>
            {meta.chainId && (meta.chainId === 295 || meta.chainId === 296 || meta.chainId === 297) && (
              <a className="text-blue-500 text-xs" href={`https://hashscan.io/${meta.chainId===295?'mainnet':meta.chainId===296?'testnet':'previewnet'}/token/${id}`} target="_blank" rel="noopener noreferrer">View on HashScan</a>
            )}
          </article>
        ))}
        {items.length === 0 && <div className="opacity-70">No NFTs yet. Mint your first above.</div>}
      </div>
    </section>
  )
}
