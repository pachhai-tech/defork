import React from "react";
import { Create } from "./components/Create";
import { Gallery } from "./components/Gallery";
import { Tour } from "./components/Tour";
import { ForkExplorer } from "./components/ForkExplorer";
import { AdminPanel } from "./components/AdminPanel";
import { RoleManager } from "./components/RoleManager";
import { QuickstartChecklist } from "./components/QuickstartChecklist";
import { AuditLog } from "./components/AuditLog";
import { VotingInterface } from "./components/VotingInterface";
import { ForkCreator } from "./components/ForkCreator";
import { ToastShelf } from "./lib/toast";
import { ConnectStorageButton } from "./components/ConnectStorageButton";
import { About } from "./components/About";
import { ConnectWalletButton } from "./components/ConnectWalletButton";

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
    const handleVoteToken = (e: CustomEvent) => {
      setSelectedTokenId(e.detail.tokenId);
      setShowVoting(true);
    };
    const handleCreateForkEvt = (e: CustomEvent) => {
      setForkParentId(e.detail.parentId);
      setShowForkCreator(true);
    };
    window.addEventListener("open-about", handleOpenAbout);
    window.addEventListener("start-tour", handleStartTour);
    window.addEventListener("vote-token", handleVoteToken as EventListener);
    window.addEventListener(
      "create-fork",
      handleCreateForkEvt as EventListener
    );

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
        handleCreateForkEvt as EventListener
      );
    };
  }, []);

  const handleTokenSelect = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    setShowVoting(true);
  };

  const handleCreateFork = (parentId: number) => {
    setForkParentId(parentId);
    setShowForkCreator(true);
  };

  const handleViewContent = (_tokenId: number) => {
    const gallerySection = document.querySelector("#gallery");
    if (gallerySection) gallerySection.scrollIntoView({ behavior: "smooth" });
  };

  async function resetLocalCache() {
    try {
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
      if ("serviceWorker" in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) {
            try {
              await r.unregister();
            } catch {}
          }
        } catch {}
      }
      if (window.caches && caches.keys) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        } catch {}
      }
      try {
        const dbs = (indexedDB as any).databases
          ? await (indexedDB as any).databases()
          : [];
        const names = (dbs || []).map((d: any) => d.name).filter(Boolean);
        const known = new Set([
          "transformers-cache",
          "webgpu-cache",
          "webnn-cache",
          "mlc-cache",
          "web-stable-diffusion"
        ]);
        for (const n of names) {
          try {
            indexedDB.deleteDatabase(n);
          } catch {}
        }
        known.forEach((n) => {
          try {
            indexedDB.deleteDatabase(n);
          } catch {}
        });
      } catch {}
      alert("Local app cache cleared. The page will reload.");
      window.location.reload();
    } catch (e: any) {
      alert("Reset failed: " + (e?.message || "unknown error"));
    }
  }

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      {/* Header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            Decentralized Creative Forking — MVP
          </h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ConnectWalletButton />
          <ConnectStorageButton />
          <a
            className="text-sm underline"
            href="/docs/index.html"
            target="_blank"
            rel="noreferrer"
          >
            Docs
          </a>
          <button
            className="text-sm underline"
            onClick={() => setShowTour(true)}
          >
            Start Tour
          </button>
          <button
            className="text-sm underline"
            onClick={() => setShowAbout(true)}
          >
            About
          </button>
          <div className="relative">
            <details className="cursor-pointer">
              <summary className="text-sm underline list-none">More</summary>
              <div className="absolute right-0 mt-2 w-44 rounded border bg-white shadow-lg z-40">
                <button
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  onClick={resetLocalCache}
                >
                  Reset cache
                </button>
              </div>
            </details>
          </div>
        </div>
      </header>

      <ToastShelf />

      <main className="mt-6 grid md:grid-cols-2 gap-8">
        {/* Checklist */}
        <div className="md:col-span-2">
          <QuickstartChecklist />
        </div>

        {/* Create + Gallery */}
        <Create />
        <div id="gallery">
          <Gallery />
        </div>

        {/* Fork Explorer */}
        <div className="md:col-span-2">
          <ForkExplorer
            onForkSelect={handleTokenSelect}
            onCreateFork={handleCreateFork}
            onViewContent={handleViewContent}
          />
        </div>

        {/* Admin tools collapsed */}
        <div className="md:col-span-2">
          <details open={false}>
            <summary className="font-medium cursor-pointer select-none px-2 py-1 rounded hover:bg-gray-50">
              Admin
            </summary>
            <div className="mt-4 space-y-6">
              <AdminPanel />
              <RoleManager />
              <AuditLog />
            </div>
          </details>
        </div>
      </main>

      {/* Voting Modal */}
      {showVoting && selectedTokenId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <ForkCreator
              parentTokenId={forkParentId || undefined}
              onSuccess={() => {
                setShowForkCreator(false);
                setForkParentId(null);
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
