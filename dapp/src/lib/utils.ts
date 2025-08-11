export function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export function bufferToHex(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer);
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export async function sha256Text(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "0x" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
