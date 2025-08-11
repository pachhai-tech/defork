/// <reference types="vite/client" />
/// <reference types="vitest" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_BUILD_COMMIT?: string;
  readonly VITE_BUILD_TIME?: string;

  readonly VITE_CHAIN_ID: string;
  readonly VITE_RPC_URL: string;
  readonly VITE_NFT_ADDRESS: `0x${string}`;
  readonly VITE_REGISTRY_ADDRESS: `0x${string}`;
  readonly VITE_ROYALTY_MANAGER_ADDRESS: `0x${string}`;
  readonly VITE_VOTING_POOL_ADDRESS: `0x${string}`;
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string;

  // Supported tokens
  readonly VITE_USDC_ADDRESS: `0x${string}`;
  readonly VITE_WETH_ADDRESS: `0x${string}`;

  // Optional features
  readonly VITE_PLAUSIBLE_DOMAIN?: string;
  readonly VITE_PLAUSIBLE_SCRIPT?: string;
  readonly VITE_MODEL_BASE_IPFS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
