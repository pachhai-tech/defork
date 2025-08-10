// Browser-side IPFS uploader using Storacha (W3UP protocol)
// Adds compat helpers: fetchIPFS, putJSON, putFile so older code keeps working.

import * as Storacha from "@storacha/client";

let _clientPromise: Promise<Storacha.Client> | null = null;

async function getClient(): Promise<Storacha.Client> {
  if (!_clientPromise) {
    _clientPromise = (async () => {
      const client = await Storacha.create();
      const spaces = await client.spaces();
      if (spaces.length === 0) {
        throw new Error(
          'No Storacha space connected. Use "Connect storage" to create/register one.'
        );
      }
      await client.setCurrentSpace(spaces[0].did());
      return client;
    })();
  }
  return _clientPromise;
}

// -------- Gateways & helpers

const GATEWAYS = [
  "https://storacha.link/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://w3s.link/ipfs/"
];

export function ipfsToHttp(uri: string, i = 0): string {
  if (!uri || !uri.startsWith("ipfs://")) return uri;
  const cidPath = uri.slice("ipfs://".length);
  const gw = GATEWAYS[i % GATEWAYS.length];
  return gw + cidPath;
}

/** Try multiple public gateways until one responds OK. */
export async function fetchIPFS(
  uri: string,
  opts?: RequestInit
): Promise<Response> {
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

// -------- Writes

export async function uploadJSON(obj: any, name = "metadata.json") {
  const client = await getClient();
  const blob = new Blob([JSON.stringify(obj)], { type: "application/json" });
  const file = new File([blob], name, { type: "application/json" });
  const cid = await client.uploadFile(file);
  return `ipfs://${cid}`;
}

export async function uploadBlob(
  blob: Blob,
  name = "file.bin",
  mime = "application/octet-stream"
) {
  const client = await getClient();
  const file = new File([blob], name, { type: mime });
  const cid = await client.uploadFile(file);
  return `ipfs://${cid}`;
}

export async function uploadDirectory(files: File[]) {
  const client = await getClient();
  const cid = await client.uploadDirectory(files);
  return `ipfs://${cid}`;
}

// -------- Back-compat aliases (so existing imports keep working)

export const putJSON = uploadJSON;
export function putFile(data: Blob | File, name = "file.bin") {
  // If it's already a File, preserve its name/type; otherwise wrap the Blob.
  if (data instanceof File)
    return uploadBlob(data, data.name, data.type || "application/octet-stream");
  return uploadBlob(data, name);
}
