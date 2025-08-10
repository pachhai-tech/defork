import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { ABI, CONTRACT_ADDRESS } from "../config/contract";
import { REGISTRY_ADDRESS } from "../config/registry";
import { fetchIPFS, putJSON } from "../lib/ipfs";
import { readContract } from "@wagmi/core";
import { config } from "../config/wallet";
import { useToast } from "../lib/toast";

type Meta = any;

function uniqNums(s: string): number[] {
  const set = new Set<number>();
  s.split(/[\s,]+/).forEach((x) => {
    const n = Number(x);
    if (!Number.isNaN(n) && n > 0) set.add(n);
  });
  return Array.from(set).sort((a, b) => a - b);
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
  const { writeContractAsync } = useWriteContract();

  if (!isAdmin) {
    return (
      <div className="border rounded p-4 bg-yellow-50 text-sm">
        <div className="font-semibold mb-1">Admin Panel</div>
        <div>Connect with an admin wallet to access controls.</div>
      </div>
    );
  }

  async function toggleHidden() {
    const ids = uniqNums(idsText);
    if (ids.length === 0)
      return push({ kind: "error", message: "No token IDs given" });
    setLoading(true);
    try {
      for (const id of ids) {
        // fetch metadata
        const uri = (await readContract(config, {
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "tokenURI",
          args: [BigInt(id)]
        })) as string;
        const res = await fetchIPFS(uri);
        const meta: Meta = await res.json();

        // flip hidden
        const m = meta || {};
        m.moderation = m.moderation || { hidden: false, reports: 0, flags: 0 };
        m.moderation.hidden = action === "hide";

        // record admin signature (optional provenance)
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

        // upload new metadata and set tokenURI
        const newUri = await putJSON(m, `meta_${id}.json`);
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "setTokenUri",
          args: [BigInt(id), newUri]
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
        // Web Crypto sha-256
        const digest = await crypto.subtle.digest("SHA-256", buf);
        const hex = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: ABI,
          functionName: "setContentHash",
          args: [BigInt(id), "0x" + hex]
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

  return (
    <section className="space-y-4 border rounded p-4">
      <div className="font-semibold">Admin Panel</div>

      <div className="space-y-2">
        <div className="font-medium">Moderation: hide/unhide</div>
        <div className="flex gap-2 items-center">
          <select
            className="border rounded p-1"
            value={action}
            onChange={(e) => setAction(e.target.value as any)}
          >
            <option value="hide">Hide</option>
            <option value="unhide">Unhide</option>
          </select>
          <textarea
            className="border rounded p-2 w-full"
            rows={2}
            placeholder="Token IDs (comma/space separated)"
            value={idsText}
            onChange={(e) => setIdsText(e.target.value)}
          />
          <button
            className="px-3 py-1 border rounded"
            disabled={loading}
            onClick={toggleHidden}
          >
            {loading ? "Working…" : "Apply"}
          </button>
        </div>
        <div className="text-xs opacity-70">
          Writes a new metadata JSON with `moderation.hidden` and updates
          tokenUri. Adds an optional admin signature (EIP-191) inside metadata.
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t">
        <div className="font-medium">Retry setContentHash (batch)</div>
        <textarea
          className="border rounded p-2 w-full"
          rows={2}
          placeholder="Token IDs (comma/space separated)"
          value={contentIdsText}
          onChange={(e) => setContentIdsText(e.target.value)}
        />
        <button
          className="px-3 py-1 border rounded"
          disabled={loading}
          onClick={retryHashes}
        >
          {loading ? "Working…" : "Update hashes"}
        </button>
        <div className="text-xs opacity-70">
          Recomputes SHA-256 from `image`, `contentURI`, or `description` (text)
          and calls on-chain `setContentHash`.
        </div>
      </div>
    </section>
  );
}
