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
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Stack,
  TextField,
  Typography
} from "@mui/material";

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

      // 2) Fetch ForkRegistered logs
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

      let es: { parent: number; child: number }[] = [];
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
          // ignore non-matching
        }
      }

      // 3) Fallback using metadata if no logs
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
    const next = new Set(expandedNodes);
    if (next.has(tokenId)) next.delete(tokenId);
    else next.add(tokenId);
    setExpandedNodes(next);
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

    if (searchQuery && !id.toString().includes(searchQuery)) {
      return null;
    }

    return (
      <Box sx={{ ml: depth * 2, mb: 1 }}>
        <Card variant="outlined">
          <CardContent sx={{ py: 1.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                {hasChildren && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => toggleExpanded(id)}
                  >
                    {isExpanded ? "−" : "+"}
                  </Button>
                )}
                <Stack>
                  <Typography fontWeight={700}>
                    <span
                      style={{ cursor: "pointer" }}
                      onClick={() => onForkSelect?.(id)}
                    >
                      Content #{id}
                    </span>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {hasChildren ? `${children.length} forks` : "No forks yet"}{" "}
                    • Depth {depth}
                  </Typography>
                </Stack>
              </Stack>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onViewContent?.(id)}
                >
                  View
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => onCreateFork?.(id)}
                >
                  Fork
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {isExpanded && hasChildren && (
          <Box sx={{ mt: 1 }}>
            {children.map((childId) => (
              <Tree key={childId} id={childId} kids={kids} depth={depth + 1} />
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Box component="section">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h6" fontWeight={800}>
          🌳 Fork Explorer
        </Typography>
        <Button
          onClick={load}
          disabled={loading}
          variant="outlined"
          size="small"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </Stack>

      <Typography variant="caption" color="text.secondary">
        Tokens: {total} • Edges: {edges.length}
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems="center"
        sx={{ mt: 1.5 }}
      >
        <TextField
          size="small"
          fullWidth
          placeholder="Search by token ID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="text" onClick={() => setSearchQuery("")}>
          Clear
        </Button>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
        {graph.roots.length === 0 ? (
          <Typography align="center" sx={{ opacity: 0.7, py: 6 }}>
            No content items found. Create the first one above! ✨
          </Typography>
        ) : (
          graph.roots.map((rootId) => (
            <Tree key={rootId} id={rootId} kids={graph.kids} depth={0} />
          ))
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Stack spacing={0.5}>
        <Typography variant="subtitle2">How to use:</Typography>
        <Typography variant="caption">
          • Click token names to select for voting
        </Typography>
        <Typography variant="caption">
          • Use View to see content in Gallery
        </Typography>
        <Typography variant="caption">
          • Use Fork to create new branches
        </Typography>
        <Typography variant="caption">
          • + / − buttons expand/collapse fork trees
        </Typography>
        <Typography variant="caption">
          • Tree shows parent-child relationships tracked on-chain
        </Typography>
      </Stack>
    </Box>
  );
}
