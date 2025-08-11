import { useEffect, useState } from "react";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import {
  ABI,
  CONTRACT_ADDRESS,
  VOTING_POOL_ADDRESS,
  VOTING_POOL_ABI
} from "../config/contract";
import { ipfsToHttp } from "../lib/ipfs";
import { explorerFor } from "../lib/chain";
import { useChainId } from "wagmi";

type Meta = {
  name: string;
  description?: string;
  image?: string;
  contentType: string;
  contributionType: string;
  model?: { id: string; version: string } | null;
  contentHash?: string;
  chainId?: number;
  moderation?: { hidden?: boolean };
};

type ItemWithStats = {
  id: number;
  meta: Meta;
  votes: number;
  totalValue: number;
};

export function Gallery() {
  const [items, setItems] = useState<ItemWithStats[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [txMap, setTxMap] = useState<Record<string, string>>({});
  const [txInfoMap, setTxInfoMap] = useState<
    Record<string, { txHash: string; txMetaUri?: string }>
  >({});
  const [loading, setLoading] = useState(false);
  const chainId = useChainId();
  const exp = explorerFor(chainId);

  const loadItems = async () => {
    setLoading(true);
    try {
      const total = Number(
        await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "totalSupply"
        })
      );

      const out: ItemWithStats[] = [];
      for (let id = 1; id <= total; id++) {
        // Get token metadata
        const uri = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "tokenURI",
          args: [BigInt(id)]
        })) as string;

        const res = await fetch(ipfsToHttp(uri));
        const meta = (await res.json()) as Meta;

        // Get voting stats
        let votes = 0;
        let totalValue = 0;
        try {
          const stats = (await readContract(config, {
            address: VOTING_POOL_ADDRESS,
            abi: VOTING_POOL_ABI,
            functionName: "getTokenStats",
            args: [BigInt(id)]
          })) as [bigint, bigint];

          votes = Number(stats[0]);
          totalValue = Number(stats[1]) / 1e18; // Convert from wei to readable value
        } catch (error) {
          // Voting contract might not be deployed yet
          console.warn(`Failed to get voting stats for token ${id}:`, error);
        }

        out.push({ id, meta, votes, totalValue });
      }

      setItems(out.reverse());

      try {
        setTxMap(JSON.parse(localStorage.getItem("mintTxByTokenId") || "{}"));
      } catch {}
      try {
        setTxInfoMap(
          JSON.parse(localStorage.getItem("mintInfoByTokenId") || "{}")
        );
      } catch {}
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleVote = (tokenId: number) => {
    window.dispatchEvent(
      new CustomEvent("vote-token", { detail: { tokenId } })
    );
  };

  const handleFork = (tokenId: number) => {
    window.dispatchEvent(
      new CustomEvent("create-fork", { detail: { parentId: tokenId } })
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">Gallery</h2>
        <button
          onClick={loadItems}
          disabled={loading}
          className="px-3 py-1 border rounded text-sm"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
          />
          Show hidden
        </label>
      </div>

      <div className="grid gap-4">
        {items
          .filter(
            ({ meta }) => showHidden || !(meta as any)?.moderation?.hidden
          )
          .map(({ id, meta, votes, totalValue }) => (
            <article
              key={id}
              className="border rounded p-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold">
                  {meta.name} <span className="opacity-60">#{id}</span>
                </h3>

                {/* Voting Stats */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600">👍</span>
                    <span className="font-medium">{votes}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-green-600">💰</span>
                    <span className="font-medium">
                      ${totalValue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {meta.image && (
                <img
                  className="mt-2 rounded max-w-full h-auto"
                  src={ipfsToHttp(meta.image)}
                  alt={meta.name}
                />
              )}

              {meta.contentType?.startsWith("text/") && (
                <p className="mt-2 text-sm opacity-80">
                  {meta.description || "(text item)"}
                </p>
              )}

              <div className="mt-2 text-xs opacity-70">
                <div>
                  Type: {meta.contentType} | {meta.contributionType}
                </div>
                {meta.model?.id && <div>Model: {meta.model.id}</div>}
                {meta.contentHash && (
                  <div>SHA-256: {meta.contentHash.slice(0, 12)}…</div>
                )}
              </div>

              <div className="flex gap-3 mt-3 flex-wrap">
                <button
                  className="text-xs underline hover:bg-purple-50 px-2 py-1 rounded"
                  onClick={() => handleVote(id)}
                >
                  💎 Vote
                </button>
                <button
                  className="text-xs underline hover:bg-blue-50 px-2 py-1 rounded"
                  onClick={() => handleFork(id)}
                >
                  🍴 Fork
                </button>
                <button
                  className="text-xs underline hover:bg-yellow-50 px-2 py-1 rounded"
                  onClick={async () => {
                    const body = {
                      tokenId: id,
                      reason: "user-report",
                      ts: Math.floor(Date.now() / 1000)
                    };
                    const blob = new Blob([JSON.stringify(body)], {
                      type: "application/json"
                    });
                    const { putFile } = await import("../lib/ipfs");
                    const uri = await putFile(blob, `report_${id}.json`);
                    alert(`Report stored: ${uri}`);
                  }}
                >
                  🚨 Report
                </button>
              </div>

              {/* Chain explorer links */}
              {meta.chainId &&
                (meta.chainId === 295 ||
                  meta.chainId === 296 ||
                  meta.chainId === 297) && (
                  <a
                    className="text-blue-500 text-xs block mt-2"
                    href={`https://hashscan.io/${
                      meta.chainId === 295
                        ? "mainnet"
                        : meta.chainId === 296
                        ? "testnet"
                        : "previewnet"
                    }/token/${id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on HashScan →
                  </a>
                )}
            </article>
          ))}
        {items.length === 0 && !loading && (
          <div className="opacity-70 text-center py-8">
            No NFTs yet. Mint your first above.
          </div>
        )}
        {loading && (
          <div className="opacity-70 text-center py-8">Loading gallery...</div>
        )}
      </div>
    </section>
  );
}
