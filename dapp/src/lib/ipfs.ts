import { Web3Storage, File } from 'web3.storage'

const client = new Web3Storage({ token: import.meta.env.VITE_WEB3STORAGE_TOKEN })
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT

const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://w3s.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/'
]

export async function putFile(file: Blob, name: string) {
  const cid = await client.put([new File([file], name)], { wrapWithDirectory: false })
  // Optional secondary pin via Pinata (by hash) to add redundancy
  if (PINATA_JWT) {
    try {
      await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${PINATA_JWT}` },
        body: JSON.stringify({ hashToPin: cid, pinataOptions: { cidVersion: 1 } })
      })
    } catch {}
  }
  return `ipfs://${cid}`
}

export async function putJSON(obj: unknown, name = 'metadata.json') {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' })
  return putFile(blob, name)
}

export function ipfsToHttp(uri: string) {
  const cid = uri.replace('ipfs://','')
  return `${GATEWAYS[0]}${cid}`
}

export async function fetchIPFS(uri: string) {
  const cid = uri.replace('ipfs://','')
  for (const gw of GATEWAYS) {
    try {
      const res = await fetch(`${gw}${cid}`, { cache: 'no-cache' })
      if (res.ok) return res
    } catch {}
  }
  throw new Error('All IPFS gateways failed')
}
