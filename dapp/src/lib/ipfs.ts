// Browser-side IPFS uploader using Storacha (W3UP protocol)
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

export function ipfsToHttp(uri: string) {
  if (!uri?.startsWith("ipfs://")) return uri;
  return `https://storacha.link/ipfs/${uri.slice(7)}`;
}

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
