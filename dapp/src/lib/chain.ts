import type { Chain } from 'viem'
import { CHAINS } from '../config/wallet'

export function getChainById(id: number): Chain | undefined {
  return CHAINS.find(c => c.id === id)
}

export function explorerFor(chainId: number): { name: string, baseUrl: string } | null {
  const c = getChainById(chainId)
  if (!c) return null
  const url = c.blockExplorers?.default?.url || ''
  const name = c.blockExplorers?.default?.name || 'Explorer'
  return { name, baseUrl: url }
}
