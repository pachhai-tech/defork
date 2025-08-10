export function nowUnix(): number { return Math.floor(Date.now() / 1000) }

export function bufferToHex(buffer: ArrayBuffer) {
  const b = new Uint8Array(buffer)
  return [...b].map(x => x.toString(16).padStart(2,'0')).join('')
}

export async function sha256Blob(blob: Blob): Promise<string> {
  const ab = await blob.arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', ab)
  return bufferToHex(digest)
}

export async function sha256Text(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', enc)
  return bufferToHex(digest)
}
