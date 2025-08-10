// Quick browserless smoke test via node (uses your .env)
import "dotenv/config";
import { NFTStorage, File } from "nft.storage";
import fs from "node:fs";

const token = process.env.VITE_NFTSTORAGE_TOKEN;
if (!token) throw new Error("Set VITE_NFTSTORAGE_TOKEN in your env");

const client = new NFTStorage({ token });
const cid = await client.storeBlob(
  new Blob([JSON.stringify({ ok: true })], { type: "application/json" })
);
console.log("Stored JSON CID:", cid);

const imgPath = "./public/icon.svg"; // or any small file you have
if (fs.existsSync(imgPath)) {
  const buf = fs.readFileSync(imgPath);
  const imgCid = await client.storeBlob(new Blob([buf]));
  console.log("Stored file CID:", imgCid);
}
