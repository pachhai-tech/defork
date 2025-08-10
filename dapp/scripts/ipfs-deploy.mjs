// dapp/scripts/ipfs-deploy.mjs
import { PinataSDK } from "pinata";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT = process.env.PINATA_JWT;
if (!JWT) {
  console.error("Missing PINATA_JWT");
  process.exit(1);
}

const pinata = new PinataSDK({
  pinataJwt: JWT
  // optional: set your dedicated gateway domain if you want:
  // pinataGateway: process.env.PINATA_GATEWAY
});

function walkDir(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkDir(full));
    else files.push(full);
  }
  return files;
}

async function main() {
  const root = path.join(__dirname, "..", "dist");
  if (!fs.existsSync(root)) {
    console.error("dist/ not found; build first");
    process.exit(1);
  }

  // Build an array of File objects. The second arg (name) can include slashes.
  // Pinata’s fileArray uploads these as a single folder preserving the structure.
  // https://docs.pinata.cloud/sdk/upload/public/file-array
  const files = [];
  for (const fp of walkDir(root)) {
    const rel = path.relative(root, fp).replace(/\\/g, "/");
    const buf = fs.readFileSync(fp);
    const type = rel.endsWith(".html")
      ? "text/html"
      : rel.endsWith(".js")
      ? "application/javascript"
      : rel.endsWith(".css")
      ? "text/css"
      : rel.endsWith(".json")
      ? "application/json"
      : "application/octet-stream";
    const file = new File([buf], rel, { type });
    files.push(file);
  }

  const upload = await pinata.upload.public
    .fileArray(files)
    .name("defork-dapp-dist");
  // upload: { cid, ... }
  console.log(upload.cid);
  fs.writeFileSync(path.join(__dirname, "cid.txt"), upload.cid, "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
