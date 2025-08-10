import { PinataSDK } from "pinata";

const JWT = process.env.PINATA_JWT;
if (!JWT) throw new Error("Set PINATA_JWT in your shell/CI");

const pinata = new PinataSDK({ pinataJwt: JWT });

const blob = new Blob([JSON.stringify({ ok: true, t: Date.now() })], {
  type: "application/json"
});
const file = new File([blob], "meta.json", { type: "application/json" });

const res = await pinata.upload.public.file(file).name("defork-smoke");
console.log("CID:", res.cid);
