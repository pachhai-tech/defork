import { useEffect, useMemo, useState } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { ABI, CONTRACT_ADDRESS } from '../config/contract'
import { useToast } from '../lib/toast'
import { isAddress, getAddress } from 'viem'

export function RoleManager() {
  const { address } = useAccount()
  const { push } = useToast()
  const { data: ownerAddr } = useReadContract({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'owner' })
  const isOwner = ownerAddr && address && ownerAddr.toLowerCase() === address.toLowerCase()
  const { writeContractAsync, isPending } = useWriteContract()

  const [target, setTarget] = useState('')
  const [mode, setMode] = useState<'grant'|'revoke'>('grant')
  const [checkAddr, setCheckAddr] = useState('')
  const [checkRes, setCheckRes] = useState<boolean | null>(null)

  async function submit() {
    if (!isOwner) return push({ kind: 'error', message: 'Connect with the owner wallet' })
    if (!isAddress(target)) return push({ kind: 'error', message: 'Invalid address' })
    try {
      await writeContractAsync({ address: CONTRACT_ADDRESS, abi: ABI, functionName: 'setAdmin', args: [getAddress(target), mode === 'grant'] })
      push({ kind: 'success', message: `${mode === 'grant' ? 'Granted' : 'Revoked'} admin: ${getAddress(target)}` })
      setTarget('')
    } catch (e:any) {
      push({ kind: 'error', message: e.message || 'Transaction failed' })
    }
  }

  async function doCheck() {
    if (!isAddress(checkAddr)) { setCheckRes(null); return }
    try {
      // read isAdmin(address)
      const res = await (window as any).wagmi?.readContract?.({})
    } catch {}
  }

  return (
    <section className="space-y-3 border rounded p-4">
      <div className="font-semibold">Role Manager (Owner-only)</div>
      <div className="text-xs opacity-70">Owner: <span className="font-mono">{String(ownerAddr)}</span></div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="border rounded p-1" value={mode} onChange={e=>setMode(e.target.value as any)}>
          <option value="grant">Grant admin</option>
          <option value="revoke">Revoke admin</option>
        </select>
        <input className="border rounded p-2 min-w-[340px]" placeholder="0xAdminAddress" value={target} onChange={e=>setTarget(e.target.value)} />
        <button className="px-3 py-1 border rounded" disabled={!isOwner || isPending} onClick={submit}>{isPending ? 'Sending…' : 'Submit'}</button>
      </div>

      <div className="text-xs opacity-70">Tip: only the contract owner can change admin roles. Admins can use the Admin Panel but cannot grant other admins.</div>
    </section>
  )
}
