import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import { Create } from './components/Create'
import { Gallery } from './components/Gallery'
import { NetworkSwitcher } from './components/NetworkSwitcher'
import { Tour } from './components/Tour'
import { ForkExplorer } from './components/ForkExplorer'
import { AdminPanel } from './components/AdminPanel'
import { RoleManager } from './components/RoleManager'
import { QuickstartChecklist } from './components/QuickstartChecklist'
import { AuditLog } from './components/AuditLog'
import { ToastShelf } from './lib/toast'
import { CHAINS } from './config/wallet'

export default function App() {
  const [showAbout, setShowAbout] = React.useState(false)
  const [showTour, setShowTour] = React.useState(false)
  React.useEffect(()=>{
    const open=()=>setShowAbout(true); window.addEventListener('open-about', open);
    if(!localStorage.getItem('tourSeen')) setShowTour(true)
    const h=()=>setShowTour(true); window.addEventListener('start-tour', h); return ()=>window.removeEventListener('start-tour', h)
      return ()=>window.removeEventListener('open-about', open)
  },[])
  const [showTour, setShowTour] = React.useState(false)
  const { address, isConnected } = useAccount()
  const { connectors, connect, status, error } = useConnect()
  const { disconnect } = useDisconnect()
  const { chains, switchChain } = useSwitchChain({ chains: CHAINS })

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl font-bold">Decentralized Creative Forking — MVP</h1>
        <NetworkSwitcher />
        <div className="flex flex-wrap items-center gap-2">
          <select className="border rounded p-1 text-sm" onChange={e => switchChain({ id: Number(e.target.value) })} defaultValue="">
            <option value="" disabled>Switch Network</option>
            {chains.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-80">{address}</span>
              <button className="px-3 py-1 border rounded" onClick={() => disconnect()}>Disconnect</button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {connectors.map((c) => (
                <button key={c.uid} className="px-3 py-1 border rounded" disabled={!c.ready}
                        onClick={() => connect({ connector: c })}>
                  {c.name}
                </button>
              ))}
              <span className="text-sm opacity-70">{status}{error && ` — ${error.message}`}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <a className="text-sm underline" href="/docs/index.html" target="_blank" rel="noreferrer">Docs</a>
          <button id="about-build-btn" className="text-sm underline">About</button>
          <button id="start-tour-btn" className="text-sm underline">Start Tour</button>
          <button id="reset-cache-btn" className="text-sm underline">Reset cache</button>
          <button id="about-btn" className="text-sm underline">About</button>
        </div>
      </header>

      <div id="about-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:1000;align-items:center;justify-content:center;">
        <div style="background:#fff;color:#000;padding:1.5rem;max-width:500px;width:90%;border-radius:8px;">
          <h2>About this build</h2>
          <pre id="about-content" style="white-space:pre-wrap;font-size:0.85rem;background:#f1f5f9;padding:0.5rem;border-radius:4px;max-height:300px;overflow:auto;"></pre>
          <div style="text-align:right;margin-top:1rem;"><button id="about-close" className="underline">Close</button></div>
        </div>
      </div>
    

      <script dangerouslySetInnerHTML={{__html: `
        (function(){
          async function resetAll(){
            try {
              // Local storage
              try { localStorage.clear() } catch {}
              try { sessionStorage.clear() } catch {}

              // Service workers & caches
              if ('serviceWorker' in navigator) {
                try {
                  const regs = await navigator.serviceWorker.getRegistrations()
                  for (const r of regs) { try { await r.unregister() } catch {} }
                } catch {}
              }
              if (window.caches && caches.keys) {
                try {
                  const keys = await caches.keys()
                  await Promise.all(keys.map(k => caches.delete(k)))
                } catch {}
              }

              // IndexedDB (best-effort; delete known DBs)
              try {
                const dbs = (indexedDB as any).databases ? await (indexedDB as any).databases() : []
                const names = (dbs || []).map((d:any)=>d.name).filter(Boolean)
                const known = new Set([
                  'transformers-cache',  // transformers.js
                  'webgpu-cache', 'webnn-cache',
                  'mlc-cache', 'web-stable-diffusion'
                ])
                for (const n of names) {
                  try { indexedDB.deleteDatabase(n) } catch {}
                }
                // Also try known names in case databases() is not available
                known.forEach(n => { try { indexedDB.deleteDatabase(n) } catch {} })
              } catch {}

              alert('Local app cache cleared. The page will reload.')
              window.location.reload()
            } catch (e) { alert('Reset failed: ' + (e && e.message ? e.message : 'unknown error')) }
          }
          document.addEventListener('click', function(e){
            const t = e.target as HTMLElement
            if (t && t.id === 'reset-cache-btn'){
              e.preventDefault()
              if (confirm('Clear local cache (wallet state unaffected) and reload?')) resetAll()
            }
          }, true)
        })();
      `}} />
      <ToastShelf />

      <main className="mt-8 grid md:grid-cols-2 gap-8">
        <div className='md:col-span-2'><QuickstartChecklist /></div>
        <Create />
        <Gallery />
        <div className="md:col-span-2">
          <ForkExplorer />
        </div>
        <div className="md:col-span-2">
          <AdminPanel />
        </div>
        <div className="md:col-span-2">
          <RoleManager />
        </div>
        <div className="md:col-span-2">
          <AuditLog />
        </div>
      
      <script dangerouslySetInnerHTML={{__html: `
        (function(){
          async function openAbout(){
            const env = {}
            try {
              const all = import.meta.env
              for (const k in all){
                if (k.startsWith('VITE_')) env[k] = all[k]
              }
            } catch {}
            let ver = {}
            try {
              const r = await fetch('/version.json')
              if (r.ok) ver = await r.json()
            } catch {}
            const out = {env, version: ver}
            document.getElementById('about-content').textContent = JSON.stringify(out,null,2)
            document.getElementById('about-modal').style.display='flex'
          }
          document.getElementById('about-build-btn').addEventListener('click', openAbout)
          document.getElementById('about-close').addEventListener('click', ()=>{
            document.getElementById('about-modal').style.display='none'
          })
        })();
      `}} />
    
</main>
      {showAbout && <About onClose={() => setShowAbout(false)} />}
      {showTour && <Tour onClose={() => { localStorage.setItem('tourSeen','1'); setShowTour(false) }} />}
    </div>
  )
}