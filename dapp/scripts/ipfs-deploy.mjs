import { NFTStorage, File, Blob } from "nft.storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN =
  process.env.VITE_NFTSTORAGE_TOKEN ||
  process.env.NFT_STORAGE_TOKEN ||
  process.env.NFTSTORAGE_TOKEN;

if (!TOKEN) {
  console.error("Missing VITE_NFTSTORAGE_TOKEN (or NFT_STORAGE_TOKEN)");
  process.exit(1);
}

const client = new NFTStorage({ token: TOKEN });

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else files.push(full);
  }
  return files;
}

function mimeTypeFor(name) {
  const n = name.toLowerCase();
  if (n.endsWith(".html")) return "text/html";
  if (n.endsWith(".css")) return "text/css";
  if (n.endsWith(".js")) return "application/javascript";
  if (n.endsWith(".json")) return "application/json";
  if (n.endsWith(".svg")) return "image/svg+xml";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".wasm")) return "application/wasm";
  if (n.endsWith(".map")) return "application/json";
  return "application/octet-stream";
}

async function main() {
  const root = path.join(__dirname, "..", "dist");
  if (!fs.existsSync(root)) {
    console.error("dist/ not found; build first (npm run build)");
    process.exit(1);
  }

  const files = walkDir(root).map((fp) => {
    const rel = path.relative(root, fp).replace(/\\/g, "/");
    const buf = fs.readFileSync(fp);
    return new File([buf], rel, { type: mimeTypeFor(rel) });
  });

  const cid = await client.storeDirectory(files);

  console.log(cid);
  fs.writeFileSync(path.join(__dirname, "cid.txt"), String(cid));

  console.error(`\nGateway URLs:
  - https://nftstorage.link/ipfs/${cid}/
  - https://ipfs.io/ipfs/${cid}/
  - https://w3s.link/ipfs/${cid}/
`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
