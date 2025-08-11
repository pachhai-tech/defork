import React from "react";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useSwitchChain
} from "wagmi";

function shortAddr(addr?: string) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function ConnectWalletButton() {
  const targetChainId = Number(import.meta.env.VITE_CHAIN_ID || 0);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connectAsync, status, error, reset } = useConnect();
  const { disconnect } = useDisconnect();
  const { chains, switchChain } = useSwitchChain();

  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [localError, setLocalError] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isConnected && targetChainId && chainId !== targetChainId) {
      try {
        switchChain({ chainId: targetChainId });
      } catch {
        // user can switch manually
      }
    }
  }, [isConnected, chainId, targetChainId, switchChain]);

  const currentChainLabel =
    chains.find((c) => c.id === chainId)?.name || `Chain ${chainId}`;

  // Sort/clean list: MetaMask, Coinbase, WalletConnect, Injected (Brave/etc.)
  const visibleConnectors = React.useMemo(() => {
    const order = [
      "metamask",
      "coinbase",
      "walletconnect",
      "injected",
      "brave"
    ];
    const byOrder = (name: string) =>
      order.findIndex((k) => name.toLowerCase().includes(k));
    // Hide generic "Injected" if MetaMask is present
    const hasMetaMask = connectors.some((c) =>
      c.name.toLowerCase().includes("metamask")
    );
    const filtered = connectors.filter((c) => {
      if (hasMetaMask && c.name.toLowerCase() === "injected") return false;
      return true;
    });
    return filtered.sort(
      (a, b) =>
        (byOrder(a.name) === -1 ? 99 : byOrder(a.name)) -
        (byOrder(b.name) === -1 ? 99 : byOrder(b.name))
    );
  }, [connectors]);

  // For UX: treat WalletConnect and Coinbase Wallet as clickable even if c.ready=false
  function connectorIsClickable(c: (typeof connectors)[number]) {
    const name = c.name.toLowerCase();
    if (pendingId) return false;
    if (name.includes("walletconnect")) return true;
    if (name.includes("coinbase")) return true;
    // MetaMask/Injected/Brave require an injected provider to be present
    return !!c.ready;
  }

  function unavailableHint(c: (typeof connectors)[number]) {
    const name = c.name.toLowerCase();
    if (name.includes("metamask"))
      return "Install MetaMask extension and refresh.";
    if (name.includes("brave"))
      return "Enable Brave Wallet in brave://settings/wallet.";
    if (name.includes("injected")) return "No injected wallet detected.";
    // For WC/Coinbase we allow clicking, so no hint
    return "";
  }

  async function handleConnectClick(c: (typeof connectors)[number]) {
    if (!connectorIsClickable(c)) return;
    setLocalError(null);
    setPendingId(c.uid);
    try {
      // Try default first
      await connectAsync({ connector: c });
      if (targetChainId && chainId !== targetChainId) {
        try {
          await switchChain({ chainId: targetChainId });
        } catch {}
      }
      setOpen(false);
    } catch (e1: any) {
      // Fallback with explicit chainId
      try {
        await connectAsync({
          connector: c,
          chainId: targetChainId || undefined
        });
        if (targetChainId && chainId !== targetChainId) {
          try {
            await switchChain({ chainId: targetChainId });
          } catch {}
        }
        setOpen(false);
      } catch (e2: any) {
        const msg =
          e2?.shortMessage ||
          e2?.message ||
          e1?.shortMessage ||
          e1?.message ||
          "Failed to connect. Check your wallet pop-up and try again.";
        setLocalError(msg);
      }
    } finally {
      setPendingId(null);
    }
  }

  // Outside-click close handlers
  React.useEffect(() => {
    function onDocClick() {
      setOpen(false);
      setMenuOpen(false);
    }
    if (open || menuOpen) {
      document.addEventListener("click", onDocClick);
      return () => document.removeEventListener("click", onDocClick);
    }
  }, [open, menuOpen]);

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-sm"
          onClick={(e) => {
            e.stopPropagation();
            reset();
            setLocalError(null);
            setOpen((v) => !v);
          }}
        >
          Connect wallet
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-[9998]" />
            <div
              className="absolute right-0 mt-2 w-64 rounded border bg-white shadow-lg z-[9999]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-2 text-xs text-gray-500">Choose a wallet</div>
              <div className="py-1">
                {visibleConnectors.map((c) => {
                  const clickable = connectorIsClickable(c);
                  const showUnavailable =
                    !clickable &&
                    (c.name.toLowerCase().includes("metamask") ||
                      c.name.toLowerCase().includes("brave") ||
                      c.name.toLowerCase() === "injected");
                  return (
                    <button
                      key={c.uid}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                        clickable ? "" : "opacity-40 cursor-not-allowed"
                      }`}
                      disabled={!clickable}
                      onClick={() => void handleConnectClick(c)}
                      title={!clickable ? unavailableHint(c) : ""}
                    >
                      {pendingId === c.uid ? "Connecting…" : c.name}
                      {showUnavailable ? " (unavailable)" : ""}
                    </button>
                  );
                })}
              </div>
              <div className="px-3 pb-2 text-xs">
                {localError ? (
                  <div className="text-red-600 mt-1">{localError}</div>
                ) : error ? (
                  <div className="text-red-600 mt-1">{error?.message}</div>
                ) : status === "pending" ? (
                  <div className="text-gray-500">Connecting…</div>
                ) : null}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Connected state
  return (
    <div className="relative">
      <button
        className="px-3 py-1.5 rounded border bg-white hover:bg-gray-50 text-sm"
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
      >
        {shortAddr(address)} • {currentChainLabel}
      </button>
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" />
          <div
            className="absolute right-0 mt-2 w-56 rounded border bg-white shadow-lg z-[9999]"
            onClick={(e) => e.stopPropagation()}
          >
            {targetChainId && chainId !== targetChainId ? (
              <button
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                onClick={() => {
                  try {
                    switchChain({ chainId: targetChainId });
                  } catch {}
                  setMenuOpen(false);
                }}
              >
                Switch to configured chain ({targetChainId})
              </button>
            ) : null}
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => {
                navigator.clipboard?.writeText(address || "");
                setMenuOpen(false);
              }}
            >
              Copy address
            </button>
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 text-red-600"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        </>
      )}
    </div>
  );
}
