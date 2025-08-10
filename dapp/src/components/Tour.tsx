import { useEffect, useState } from 'react'

const steps = [
  { key: 'connect',   title: 'Connect your wallet', text: 'Use MetaMask, Coinbase, or WalletConnect to get started.' },
  { key: 'create',    title: 'Create / Mint',       text: 'Write or generate content locally, upload to IPFS, then mint.' },
  { key: 'gallery',   title: 'Gallery & Explorer',  text: 'See your NFTs and navigate forks via the Fork Explorer.' },
  { key: 'vote',      title: 'What’s next',         text: 'Voting & full economy land in the next phase.' }
]

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const s = steps[i]

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function next() { if (i < steps.length - 1) setI(i+1); else onClose() }
  function prev() { if (i > 0) setI(i-1) }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:60,display:'grid',placeItems:'center'}}>
      <div className="bg-white border rounded shadow max-w-md w-[92%] p-4">
        <div className="text-sm opacity-60">{i+1} / {steps.length}</div>
        <h3 className="text-lg font-semibold mt-1">{s.title}</h3>
        <p className="mt-2 text-sm">{s.text}</p>
        <div className="mt-4 flex justify-between items-center">
          <button className="px-3 py-1 border rounded" onClick={onClose}>Close</button>
          <div className="flex gap-2">
            <button className="px-3 py-1 border rounded" onClick={prev} disabled={i===0}>Back</button>
            <button className="px-3 py-1 border rounded" onClick={next}>{i===steps.length-1 ? 'Finish' : 'Next'}</button>
          </div>
        </div>
        <div className="mt-2 text-xs opacity-60">Tip: Use <kbd>→</kbd> and <kbd>←</kbd>, or <kbd>Esc</kbd> to close.</div>
      </div>
    </div>
  )
}
