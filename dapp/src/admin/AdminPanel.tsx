import React, { useState, useEffect } from 'react'
import { useAccount, useWalletClient } from 'wagmi'
import { isAddress } from 'viem'
import { CONTRACTS } from '../config'
import { abi as StoryForkNFT_ABI } from '../../../contracts/out/StoryForkNFT.sol/StoryForkNFT.json'

// Simple allowlist
const ALLOWLIST = [
  // lowercase addresses
  '0x1234abcd...'
]

export default function AdminPanel() {
  const { address } = useAccount()
  const { data: walletClient } = useWalletClient()
  const [tokenId, setTokenId] = useState('')
  const [hidden, setHidden] = useState(false)
  const [status, setStatus] = useState('')

  const allowed = address && ALLOWLIST.includes(address.toLowerCase())

  async function toggleHidden() {
    if (!walletClient || !allowed) return
    if (!tokenId) { setStatus('Enter tokenId'); return }
    try {
      setStatus('Sending tx...')
      const hash = await walletClient.writeContract({
        address: CONTRACTS.StoryForkNFT,
        abi: StoryForkNFT_ABI,
        functionName: 'setModerationHidden',
        args: [BigInt(tokenId), hidden],
      })
      setStatus('Tx sent: ' + hash)
    } catch (err) {
      console.error(err)
      setStatus('Error: ' + err.message)
    }
  }

  if (!allowed) return <div>Not authorized</div>

  return (
    <div style={{ padding: '1rem', border: '1px solid red' }}>
      <h3>Admin Panel</h3>
      <label>Token ID: <input value={tokenId} onChange={e=>setTokenId(e.target.value)} /></label>
      <label>
        Hidden: 
        <input type="checkbox" checked={hidden} onChange={e=>setHidden(e.target.checked)} />
      </label>
      <button onClick={toggleHidden}>Toggle</button>
      <div>{status}</div>
    </div>
  )
}
