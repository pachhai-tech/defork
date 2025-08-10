import { useEffect, useState } from 'react'
import { useSwitchChain, useChainId } from 'wagmi'
import { CHAINS } from '../config/wallet'

export function NetworkSwitcher() {
  const chainId = useChainId()
  const { chains, switchChain } = useSwitchChain()
  const [target, setTarget] = useState<number>(chainId)

  useEffect(() => setTarget(chainId), [chainId])

  return (
    <div className="flex items-center gap-2">
      <select
        className="border rounded p-1"
        value={target}
        onChange={(e) => setTarget(Number(e.target.value))}
      >
        {CHAINS.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({c.id})
          </option>
        ))}
      </select>
      <button className="px-3 py-1 border rounded"
        onClick={() => {
          const c = chains.find(x => x.id === target)
          if (c) switchChain({ chainId: c.id })
        }}
      >
        Switch
      </button>
    </div>
  )
}
