// dapp/src/lib/ipfs.ts
// Unified IPFS helpers (NFT.Storage-backed)
// Works 100% in the browser — no backend secrets needed.

import { NFTStorage } from "nft.storage";

const GATEWAYS = [
  "https://nftstorage.link/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://w3s.link/ipfs/"
];

// -------- URI helpers

export function ipfsToHttp(uri: string, i = 0): string {
  if (!uri) return uri;
  if (!uri.startsWith("ipfs://")) return uri;
  const cidPath = uri.slice("ipfs://".length);
  const gw = GATEWAYS[i % GATEWAYS.length];
  return gw + cidPath;
}

export async function fetchIPFS(
  uri: string,
  opts?: RequestInit
): Promise<Response> {
  // try gateways in order until one succeeds
  let lastErr: unknown;
  for (let i = 0; i < GATEWAYS.length; i++) {
    try {
      const r = await fetch(ipfsToHttp(uri, i), opts);
      if (r.ok) return r;
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("IPFS fetch failed");
}

// -------- NFT.Storage client

let _client: NFTStorage | null = null;
function getClient(): NFTStorage {
  if (_client) return _client;
  const token = import.meta.env.VITE_NFTSTORAGE_TOKEN as string | undefined;
  if (!token) {
    throw new Error("VITE_NFTSTORAGE_TOKEN not set — add it to dapp/.env");
  }
  _client = new NFTStorage({ token });
  return _client;
}

// -------- Write helpers

export async function putJSON(
  obj: any,
  filename = "metadata.json"
): Promise<string> {
  // store as a single blob (simplest); returns ipfs://<cid>
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const cid = await getClient().storeBlob(blob);
  return `ipfs://${cid}`;
}

/**
 * Store a single File/Blob. Returns ipfs://<cid>
 */
export async function putBlob(data: Blob | File): Promise<string> {
  const cid = await getClient().storeBlob(data);
  return `ipfs://${cid}`;
}

/**
 * Store a named directory of files.
 * Pass an array of File objects (names matter).
 * Returns { cid, uri, uriFor(name) } where:
 *  - uri is "ipfs://<cid>"
 *  - uriFor('meta.json') -> "ipfs://<cid>/meta.json"
 */
export async function putDirectory(files: File[]) {
  if (!files?.length) throw new Error("putDirectory: no files");
  const cid = await getClient().storeDirectory(files);
  const base = `ipfs://${cid}`;
  return {
    cid,
    uri: base,
    uriFor: (name: string) => `${base}/${encodeURIComponent(name)}`
  };
}
