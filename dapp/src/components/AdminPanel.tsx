import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ABI, CONTRACT_ADDRESS, REGISTRY_ADDRESS } from "../config/contract";
import { fetchIPFS, putJSON } from "../lib/ipfs";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import { useToast } from "../lib/toast";

import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  TextField,
  Select,
  MenuItem,
  Button,
  Alert
} from "@mui/material";

type Meta = any;

function uniqNums(s: string): number[] {
  const ids = (s || "")
    .split(/[\s,]+/)
    .map((t) => Number(t.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(ids));
}

export function AdminPanel() {
  const { address } = useAccount();
  const { push } = useToast();
  const { data: isAdminData } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: ABI,
    functionName: "isAdmin",
    args: [address ?? "0x0000000000000000000000000000000000000000"]
  });

  const isAdmin = Boolean(isAdminData);
  const [idsText, setIdsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<"hide" | "unhide">("hide");
  const [contentIdsText, setContentIdsText] = useState("");
  const { writeContract } = useWriteContract();

  async function toggleHidden() {
    const ids = uniqNums(idsText);
    if (ids.length === 0)
      return push({ kind: "error", message: "No token IDs given" });
    setLoading(true);
    try {
      for (const id of ids) {
        const uri = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "tokenURI",
          args: [BigInt(id)]
        })) as string;
        const res = await fetchIPFS(uri);
        const meta: Meta = await res.json();

        const m = meta || {};
        m.moderation = m.moderation || { hidden: false, reports: 0, flags: 0 };
        m.moderation.hidden = action === "hide";

        try {
          const msg = `moderation:${action}:#${id}:ts:${Math.floor(
            Date.now() / 1000
          )}`;
          const sig = await (window as any).ethereum.request({
            method: "personal_sign",
            params: [msg, address]
          });
          m.moderation.adminSig = sig;
        } catch {}

        const newUri = await putJSON(m, `meta_${id}.json`);
        await new Promise<void>((resolve, reject) => {
          writeContract(
            {
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "setTokenUri",
              args: [BigInt(id), newUri]
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error)
            }
          );
        });
        push({ kind: "success", message: `#${id} ${action}d` });
      }
    } catch (e: any) {
      push({
        kind: "error",
        message: e.message || "Failed to update some items"
      });
    } finally {
      setLoading(false);
    }
  }

  async function retryHashes() {
    const ids = uniqNums(contentIdsText);
    if (ids.length === 0)
      return push({ kind: "error", message: "No token IDs given" });
    setLoading(true);
    try {
      for (const id of ids) {
        const uri = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "tokenURI",
          args: [BigInt(id)]
        })) as string;
        const res = await fetchIPFS(uri);
        const meta: Meta = await res.json();
        let blob: Blob | null = null;

        if (meta?.image) {
          const r = await fetch(
            meta.image.replace("ipfs://", "https://ipfs.io/ipfs/")
          );
          blob = await r.blob();
        } else if (meta?.contentURI) {
          const r = await fetch(
            meta.contentURI.replace("ipfs://", "https://ipfs.io/ipfs/")
          );
          blob = await r.blob();
        } else if (
          meta?.contentType?.startsWith("text/") &&
          meta?.description
        ) {
          blob = new Blob([meta.description], { type: "text/plain" });
        }

        if (!blob) {
          push({
            kind: "error",
            message: `#${id}: cannot locate content to hash`
          });
          continue;
        }

        const buf = new Uint8Array(await blob.arrayBuffer());
        const digest = await crypto.subtle.digest("SHA-256", buf);
        const hex = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const contentHash = ("0x" + hex) as `0x${string}`;

        await new Promise<void>((resolve, reject) => {
          writeContract(
            {
              address: CONTRACT_ADDRESS,
              abi: ABI,
              functionName: "setContentHash",
              args: [BigInt(id), contentHash]
            },
            {
              onSuccess: () => resolve(),
              onError: (error) => reject(error)
            }
          );
        });
        push({ kind: "success", message: `#${id} contentHash updated` });
      }
    } catch (e: any) {
      push({
        kind: "error",
        message: e.message || "Failed to update some hashes"
      });
    } finally {
      setLoading(false);
    }
  }

  if (!isAdmin) {
    return (
      <Alert severity="warning" variant="outlined">
        <Typography fontWeight={700} component="div">
          Admin Panel
        </Typography>
        Connect with an admin wallet to access controls.
      </Alert>
    );
  }

  return (
    <Card variant="outlined">
      <CardHeader
        title={<Typography fontWeight={800}>Admin Panel</Typography>}
      />
      <CardContent>
        <Stack spacing={3}>
          <Stack spacing={1}>
            <Typography fontWeight={700}>Moderation: hide/unhide</Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems="flex-start"
            >
              <Select
                value={action}
                onChange={(e) => setAction(e.target.value as any)}
                size="small"
                sx={{ width: 160 }}
              >
                <MenuItem value="hide">Hide</MenuItem>
                <MenuItem value="unhide">Unhide</MenuItem>
              </Select>
              <TextField
                label="Token IDs (comma/space separated)"
                multiline
                minRows={2}
                value={idsText}
                onChange={(e) => setIdsText(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={toggleHidden}
                disabled={loading}
              >
                {loading ? "Working…" : "Apply"}
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Writes a new metadata JSON with moderation.hidden and updates
              tokenURI. Adds an optional admin signature (EIP‑191) inside
              metadata.
            </Typography>
          </Stack>

          <Stack
            spacing={1}
            sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2 }}
          >
            <Typography fontWeight={700}>
              Retry setContentHash (batch)
            </Typography>
            <TextField
              label="Token IDs (comma/space separated)"
              multiline
              minRows={2}
              value={contentIdsText}
              onChange={(e) => setContentIdsText(e.target.value)}
              fullWidth
            />
            <Button variant="outlined" onClick={retryHashes} disabled={loading}>
              {loading ? "Working…" : "Update hashes"}
            </Button>
            <Typography variant="caption" color="text.secondary">
              Recomputes SHA‑256 from image/contentURI/description (text) and
              calls on‑chain setContentHash.
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
