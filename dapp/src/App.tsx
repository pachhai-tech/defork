import React from "react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { Create } from "./components/Create";
import { Gallery } from "./components/Gallery";
import { NetworkSwitcher } from "./components/NetworkSwitcher";
import { Tour } from "./components/Tour";
import { ForkExplorer } from "./components/ForkExplorer";
import { AdminPanel } from "./components/AdminPanel";
import { RoleManager } from "./components/RoleManager";
import { QuickstartChecklist } from "./components/QuickstartChecklist";
import { AuditLog } from "./components/AuditLog";
import { VotingInterface } from "./components/VotingInterface";
import { ForkCreator } from "./components/ForkCreator";
import { ToastShelf } from "./lib/toast";
import { CHAINS } from "./config/wallet";
import { ConnectStorageButton } from "./components/ConnectStorageButton";
import { About } from "./components/About";

export default function App() {
  const [showAbout, setShowAbout] = React.useState(false);
  const [showTour, setShowTour] = React.useState(false);
  const [selectedTokenId, setSelectedTokenId] = React.useState<number | null>(
    null
  );
  const [showVoting, setShowVoting] = React.useState(false);
  const [showForkCreator, setShowForkCreator] = React.useState(false);
  const [forkParentId, setForkParentId] = React.useState<number | null>(null);

  React.useEffect(() => {
    const handleOpenAbout = () => setShowAbout(true);
    const handleStartTour = () => setShowTour(true);

    // Handle custom events from Gallery for voting
    const handleVoteToken = (e: CustomEvent) => {
      setSelectedTokenId(e.detail.tokenId);
      setShowVoting(true);
    };

    // Handle custom events for fork creation
    const handleCreateFork = (e: CustomEvent) => {
      setForkParentId(e.detail.parentId);
      setShowForkCreator(true);
    };

    window.addEventListener("open-about", handleOpenAbout);
    window.addEventListener("start-tour", handleStartTour);
    window.addEventListener("vote-token", handleVoteToken as EventListener);
    window.addEventListener("create-fork", handleCreateFork as EventListener);

    if (!localStorage.getItem("tourSeen")) setShowTour(true);

    return () => {
      window.removeEventListener("open-about", handleOpenAbout);
      window.removeEventListener("start-tour", handleStartTour);
      window.removeEventListener(
        "vote-token",
        handleVoteToken as EventListener
      );
      window.removeEventListener(
        "create-fork",
        handleCreateFork as EventListener
      );
    };
  }, []);

  const { address, isConnected } = useAccount();
  const { connectors, connect, status, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain({ chains: CHAINS });

  const handleTokenSelect = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    setShowVoting(true);
  };

  const handleCreateFork = (parentId: number) => {
    setForkParentId(parentId);
    setShowForkCreator(true);
  };

  const handleViewContent = (tokenId: number) => {
    // Scroll to gallery section
    const gallerySection = document.querySelector("#gallery");
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <h1 className="text-2xl font-bold">
          Decentralized Creative Forking — MVP
        </h1>
        <NetworkSwitcher />
        <div className="flex flex-wrap items-center gap-2">
          <select
            className="border rounded p-1 text-sm"
            onChange={(e) => switchChain({ id: Number(e.target.value) })}
            defaultValue=""
          >
            <option value="" disabled>
              Switch Network
            </option>
            {chains.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {isConnected ? (
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-80">{address}</span>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => disconnect()}
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {connectors.map((c) => (
                <button
                  key={c.uid}
                  className="px-3 py-1 border rounded"
                  disabled={!c.ready}
                  onClick={() => connect({ connector: c })}
                >
                  {c.name}
                </button>
              ))}
              <span className="text-sm opacity-70">
                {status}
                {error && ` — ${error.message}`}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <a
            className="text-sm underline"
            href="/docs/index.html"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
          <button id="about-build-btn" className="text-sm underline">
            About
          </button>
          <button
            id="start-tour-btn"
            className="text-sm underline"
            onClick={() => setShowTour(true)}
          >
            Start Tour
          </button>
          <ConnectStorageButton />
          <button id="reset-cache-btn" className="text-sm underline">
            Reset cache
          </button>
          <button
            id="about-btn"
            className="text-sm underline"
            onClick={() => setShowAbout(true)}
          >
            About
          </button>
        </div>
      </header>

      {/* About overlay (build/env info) */}
      <div
        id="about-modal"
        style={{
          display: "none",
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(0,0,0,.6)",
          zIndex: 1000,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            background: "#fff",
            color: "#000",
            padding: "1.5rem",
            maxWidth: "500px",
            width: "90%",
            borderRadius: "8px"
          }}
        >
          <h2>About this build</h2>
          <pre
            id="about-content"
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "0.85rem",
              background: "#f1f5f9",
              padding: "0.5rem",
              borderRadius: "4px",
              maxHeight: "300px",
              overflow: "auto"
            }}
          />
          <div style={{ textAlign: "right", marginTop: "1rem" }}>
            <button id="about-close" className="underline">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Reset cache handler */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
          (function(){
            async function resetAll(){
              try {
                try { localStorage.clear() } catch {}
                try { sessionStorage.clear() } catch {}
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
                try {
                  const dbs = (indexedDB).databases ? await (indexedDB).databases() : []
                  const names = (dbs || []).map((d)=>d.name).filter(Boolean)
                  const known = new Set(['transformers-cache','webgpu-cache','webnn-cache','mlc-cache','web-stable-diffusion'])
                  for (const n of names) { try { indexedDB.deleteDatabase(n) } catch {} }
                  known.forEach(n => { try { indexedDB.deleteDatabase(n) } catch {} })
                } catch {}
                alert('Local app cache cleared. The page will reload.')
                window.location.reload()
              } catch (e) { alert('Reset failed: ' + (e && e.message ? e.message : 'unknown error')) }
            }
            document.addEventListener('click', function(e){
              const t = e.target
              if (t && t.id === 'reset-cache-btn'){
                e.preventDefault()
                if (confirm('Clear local cache (wallet state unaffected) and reload?')) resetAll()
              }
            }, true)
          })();
        `
        }}
      />
      <ToastShelf />

      <main className="mt-8 grid md:grid-cols-2 gap-8">
        <div className="md:col-span-2">
          <QuickstartChecklist />
        </div>

        {/* Quick Actions for new features */}
        <div className="md:col-span-2 flex gap-4 flex-wrap">
          <button
            onClick={() => setShowForkCreator(true)}
            className="px-4 py-2 border rounded font-medium bg-blue-50 hover:bg-blue-100"
          >
            ✨ Create New Content
          </button>
          <button
            onClick={() => setShowVoting(true)}
            className="px-4 py-2 border rounded font-medium bg-purple-50 hover:bg-purple-100"
            disabled={!selectedTokenId}
          >
            💎 Vote on Selected Content{" "}
            {selectedTokenId && `#${selectedTokenId}`}
          </button>
        </div>

        <Create />
        <div id="gallery">
          <Gallery />
        </div>
        <div className="md:col-span-2">
          <ForkExplorer
            onForkSelect={handleTokenSelect}
            onCreateFork={handleCreateFork}
            onViewContent={handleViewContent}
          />
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

        {/* About build modal wiring */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function(){
            async function openAbout(){
              const env = {}
              try {
                const all = import.meta.env
                for (const k in all){ if (k.startsWith('VITE_')) env[k] = all[k] }
              } catch {}
              let ver = {}
              try {
                const r = await fetch('/version.json')
                if (r.ok) ver = await r.json()
              } catch {}
              const out = {env, version: ver}
              const el = document.getElementById('about-content')
              if (el) el.textContent = JSON.stringify(out,null,2)
              const modal = document.getElementById('about-modal')
              if (modal) modal.style.display='flex'
            }
            const openBtn = document.getElementById('about-build-btn')
            if (openBtn) openBtn.addEventListener('click', openAbout)
            const closeBtn = document.getElementById('about-close')
            if (closeBtn) closeBtn.addEventListener('click', ()=>{
              const modal = document.getElementById('about-modal')
              if (modal) modal.style.display='none'
            })
          })();
        `
          }}
        />
      </main>

      {/* Voting Interface Modal */}
      {showVoting && selectedTokenId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                Vote for Content #{selectedTokenId}
              </h2>
              <button
                onClick={() => setShowVoting(false)}
                className="px-3 py-1 border rounded"
              >
                ×
              </button>
            </div>
            <VotingInterface
              tokenId={selectedTokenId}
              onVoteSuccess={() => {
                setShowVoting(false);
                setSelectedTokenId(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Fork Creator Modal */}
      {showForkCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <ForkCreator
              parentTokenId={forkParentId || undefined}
              onSuccess={(tokenId) => {
                setShowForkCreator(false);
                setForkParentId(null);
                // Refresh the page to show new content
                window.location.reload();
              }}
              onClose={() => {
                setShowForkCreator(false);
                setForkParentId(null);
              }}
            />
          </div>
        </div>
      )}

      {showAbout && <About onClose={() => setShowAbout(false)} />}

      {showTour && (
        <Tour
          onClose={() => {
            localStorage.setItem("tourSeen", "1");
            setShowTour(false);
          }}
        />
      )}
    </div>
  );
}
