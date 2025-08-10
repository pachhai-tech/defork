
// Wrap fetch or loader with IPFS base override
export function rewriteModelUrl(url: string): string {
  const ipfsBase = import.meta.env.VITE_MODEL_BASE_IPFS
  if (ipfsBase && url && !url.startsWith('ipfs://') && !url.startsWith(ipfsBase)) {
    // Extract filename or path
    const path = url.split('/').slice(-1)[0]
    return ipfsBase.replace(/\/$/, '') + '/' + path
  }
  return url
}
