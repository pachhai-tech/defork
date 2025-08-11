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

import {
  Box,
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Checkbox,
  FormControlLabel,
  Divider
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ThumbUpOffAltIcon from "@mui/icons-material/ThumbUpOffAlt";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import FlagIcon from "@mui/icons-material/Flag";
import LaunchIcon from "@mui/icons-material/Launch";

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
        const uri = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "tokenURI",
          args: [BigInt(id)]
        })) as string;

        const res = await fetch(ipfsToHttp(uri));
        const meta = (await res.json()) as Meta;

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
          totalValue = Number(stats[1]) / 1e18;
        } catch (error) {
          console.warn(`Failed to get voting stats for token ${id}:`, error);
        }

        out.push({ id, meta, votes, totalValue });
      }

      setItems(out.reverse());
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
    <Box component="section">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        mb={2}
      >
        <Typography variant="h6" fontWeight={800}>
          Gallery
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Checkbox
                checked={showHidden}
                onChange={(e) => setShowHidden(e.target.checked)}
              />
            }
            label="Show hidden"
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadItems}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Stack>

      <Stack spacing={2}>
        {items
          .filter(
            ({ meta }) => showHidden || !(meta as any)?.moderation?.hidden
          )
          .map(({ id, meta, votes, totalValue }) => (
            <Card key={id} variant="outlined">
              <CardHeader
                title={
                  <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography fontWeight={700}>{meta.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      #{id}
                    </Typography>
                  </Stack>
                }
                subheader={
                  <Typography variant="body2" color="text.secondary">
                    Type: {meta.contentType} • {meta.contributionType}
                    {meta.model?.id ? ` • Model: ${meta.model.id}` : ""}
                  </Typography>
                }
              />
              <CardContent>
                {meta.image && (
                  <Box
                    component="img"
                    sx={{ mt: 1, maxWidth: "100%", borderRadius: 1 }}
                    src={ipfsToHttp(meta.image)}
                    alt={meta.name}
                  />
                )}
                {meta.contentType?.startsWith("text/") && (
                  <Typography
                    variant="body2"
                    sx={{ mt: 1 }}
                    color="text.secondary"
                  >
                    {meta.description || "(text item)"}
                  </Typography>
                )}

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Typography variant="body2">
                    👍 <strong>{votes}</strong>
                  </Typography>
                  <Typography variant="body2">
                    💰 <strong>${totalValue.toFixed(2)}</strong>
                  </Typography>
                  {meta.contentHash && (
                    <Typography variant="caption" color="text.secondary">
                      SHA-256: {meta.contentHash.slice(0, 12)}…
                    </Typography>
                  )}
                </Stack>

                {meta.chainId &&
                  (meta.chainId === 295 ||
                    meta.chainId === 296 ||
                    meta.chainId === 297) && (
                    <Button
                      size="small"
                      endIcon={<LaunchIcon />}
                      sx={{ mt: 1 }}
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
                      View on HashScan
                    </Button>
                  )}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<ThumbUpOffAltIcon />}
                  onClick={() => handleVote(id)}
                >
                  Vote
                </Button>
                <Button
                  size="small"
                  startIcon={<CallSplitIcon />}
                  onClick={() => handleFork(id)}
                >
                  Fork
                </Button>
                <Button
                  size="small"
                  color="warning"
                  startIcon={<FlagIcon />}
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
                  Report
                </Button>
              </CardActions>
            </Card>
          ))}

        {items.length === 0 && !loading && (
          <Box sx={{ opacity: 0.7, textAlign: "center", py: 8 }}>
            No NFTs yet. Mint your first above.
          </Box>
        )}
        {loading && (
          <Box sx={{ opacity: 0.7, textAlign: "center", py: 8 }}>
            Loading gallery...
          </Box>
        )}
      </Stack>
    </Box>
  );
}
