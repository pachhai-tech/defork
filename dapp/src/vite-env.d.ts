/// <reference types="vite/client" />
/// <reference types="vitest" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string
  readonly VITE_BUILD_COMMIT?: string
  readonly VITE_BUILD_TIME?: string

  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
  readonly VITE_CONTRACT_ADDRESS: `0x${string}`
  readonly VITE_REGISTRY_ADDRESS: `0x${string}`
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string

  // Optional features
  readonly VITE_PLAUSIBLE_DOMAIN?: string
  readonly VITE_PLAUSIBLE_SCRIPT?: string
  readonly VITE_MODEL_BASE_IPFS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
