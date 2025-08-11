import { useEffect, useMemo, useState } from "react";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import {
  ABI,
  CONTRACT_ADDRESS,
  REGISTRY_ABI,
  REGISTRY_ADDRESS
} from "../config/contract";
import {
  createPublicClient,
  defineChain,
  http,
  decodeEventLog,
  type Log
} from "viem";
import { ipfsToHttp } from "../lib/ipfs";

interface ForkExplorerProps {
  onForkSelect?: (tokenId: number) => void;
  onCreateFork?: (parentId: number) => void;
  onViewContent?: (tokenId: number) => void;
}

export function ForkExplorer({
  onForkSelect,
  onCreateFork,
  onViewContent
}: ForkExplorerProps) {
  const [edges, setEdges] = useState<{ parent: number; child: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedNodes, setExpandedNodes] = useState<Set<number>>(new Set([1]));

  async function load() {
    setLoading(true);
    try {
      // 1) totalSupply to bound loop/fallback
      const t = (await readContract(config, {
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: "totalSupply"
      })) as bigint;
      setTotal(Number(t));

      // 2) Fetch ForkRegistered logs via a viem public client
      const chain = defineChain({
        id: Number(import.meta.env.VITE_CHAIN_ID || 0),
        name: "Configured",
        nativeCurrency: { name: "Native", symbol: "NATIVE", decimals: 18 },
        rpcUrls: { default: { http: [import.meta.env.VITE_RPC_URL || ""] } }
      });
      const client = createPublicClient({
        chain,
        transport: http(import.meta.env.VITE_RPC_URL || "")
      });

      const latest = await client.getBlockNumber();
      const span = 50_000n;
      const fromBlock = latest > span ? latest - span : 0n;

      const logs = await client.getLogs({
        address: REGISTRY_ADDRESS,
        fromBlock,
        toBlock: latest
      });

      let es = [] as { parent: number; child: number }[];
      for (const log of logs as Log[]) {
        try {
          const dec = decodeEventLog({
            abi: REGISTRY_ABI,
            data: log.data,
            topics: log.topics
          });
          if (dec.eventName === "ForkRegistered") {
            const parent = Number(dec.args.parentTokenId as bigint);
            const child = Number(dec.args.childTokenId as bigint);
            es.push({ parent, child });
          }
        } catch {
          // ignore non-matching events
        }
      }

      // 3) Fallback: traverse metadata to detect parentTokenId relationships
      if (es.length === 0) {
        try {
          const out: { parent: number; child: number }[] = [];
          for (let id = 1; id <= Number(t); id++) {
            const uri = (await readContract(config, {
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "tokenURI",
              args: [BigInt(id)]
            })) as string;
            const res = await fetch(ipfsToHttp(uri));
            const meta = await res.json();
            const p = Number(meta?.parentTokenId || 0);
            if (p && p > 0) out.push({ parent: p, child: id });
          }
          if (out.length > 0) es = out;
        } catch (e) {
          console.warn("metadata fallback failed", e);
        }
      }

      setEdges(es);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const graph = useMemo(() => {
    const kids: Record<number, number[]> = {};
    const seenChild = new Set<number>();
    for (const e of edges) {
      if (!kids[e.parent]) kids[e.parent] = [];
      kids[e.parent].push(e.child);
      seenChild.add(e.child);
    }
    const roots: number[] = [];
    for (let i = 1; i <= total; i++) {
      if (!seenChild.has(i)) roots.push(i);
    }
    return { kids, roots };
  }, [edges, total]);

  const toggleExpanded = (tokenId: number) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(tokenId)) {
      newExpanded.delete(tokenId);
    } else {
      newExpanded.add(tokenId);
    }
    setExpandedNodes(newExpanded);
  };

  const Tree = ({
    id,
    kids,
    depth
  }: {
    id: number;
    kids: Record<number, number[]>;
    depth: number;
  }) => {
    const children = kids[id] || [];
    const isExpanded = expandedNodes.has(id);
    const hasChildren = children.length > 0;

    // Filter based on search
    if (searchQuery && !id.toString().includes(searchQuery)) {
      return null;
    }

    return (
      <div style={{ marginLeft: depth * 20 }} className="mb-2">
        <div className="border rounded p-3 bg-white hover:shadow-sm transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasChildren && (
                <button
                  onClick={() => toggleExpanded(id)}
                  className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
                >
                  {isExpanded ? "−" : "+"}
                </button>
              )}

              <div>
                <div className="font-medium">
                  <span
                    className="cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => onForkSelect?.(id)}
                  >
                    Content #{id}
                  </span>
                </div>
                <div className="text-xs opacity-70">
                  {hasChildren ? `${children.length} forks` : "No forks yet"} •
                  Depth {depth}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onViewContent?.(id)}
                className="px-2 py-1 border rounded text-xs hover:bg-gray-50"
              >
                👁 View
              </button>
              <button
                onClick={() => onCreateFork?.(id)}
                className="px-2 py-1 border rounded text-xs hover:bg-blue-50"
              >
                🍴 Fork
              </button>
            </div>
          </div>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2">
            {children.map((childId) => (
              <Tree key={childId} id={childId} kids={kids} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-lg">🌳 Fork Explorer</h2>
        <button
          onClick={load}
          disabled={loading}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
        >
          {loading ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      <div className="flex items-center gap-3 text-sm opacity-70">
        <span>
          Tokens: {total} • Edges: {edges.length}
        </span>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          className="border rounded p-2 flex-1"
          placeholder="Search by token ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button
          onClick={() => setSearchQuery("")}
          className="px-3 py-1 border rounded hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      {/* Tree Display */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {graph.roots.length === 0 ? (
          <div className="text-center py-8 opacity-70">
            No content items found. Create the first one above! ✨
          </div>
        ) : (
          graph.roots.map((rootId) => (
            <Tree key={rootId} id={rootId} kids={graph.kids} depth={0} />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="text-xs opacity-70 border-t pt-3">
        <div className="font-medium mb-1">How to use:</div>
        <div>• Click token names to select for voting</div>
        <div>• Use 👁 View to see content in Gallery</div>
        <div>• Use 🍴 Fork to create new branches</div>
        <div>• + / − buttons expand/collapse fork trees</div>
        <div>• Tree shows parent-child relationships tracked on-chain</div>
      </div>
    </section>
  );
}
