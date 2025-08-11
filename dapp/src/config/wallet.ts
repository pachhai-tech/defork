import { http, createConfig } from "wagmi";
import {
  sepolia,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  polygonAmoy
} from "wagmi/chains";
import { coinbaseWallet, injected, walletConnect } from "wagmi/connectors";
import type { Chain } from "viem";

// Hedera custom chains
export const hederaMainnet: Chain = {
  id: 295,
  name: "Hedera",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://mainnet.hashio.io/api"] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/mainnet" }
  }
} as const;

export const hederaTestnet: Chain = {
  id: 296,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet.hashio.io/api"] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/testnet" }
  },
  testnet: true
} as const;

export const hederaPreviewnet: Chain = {
  id: 297,
  name: "Hedera Previewnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: ["https://previewnet.hashio.io/api"] } },
  blockExplorers: {
    default: { name: "HashScan", url: "https://hashscan.io/previewnet" }
  },
  testnet: true
} as const;

export const CHAINS: Chain[] = [
  hederaTestnet,
  hederaMainnet,
  hederaPreviewnet,
  base,
  baseSepolia,
  optimism,
  optimismSepolia,
  polygonAmoy,
  sepolia
];

const wcId = (import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "").trim();

export const config = createConfig({
  chains: CHAINS,
  connectors: [
    injected({ shimDisconnect: true }),
    coinbaseWallet({ appName: "Creative Forking", preference: "all" }),
    ...(wcId ? [walletConnect({ projectId: wcId })] : []) // only enable if real ID is set
  ],
  transports: Object.fromEntries(
    CHAINS.map((c) => [
      c.id,
      http(c.rpcUrls.default.http[0] || import.meta.env.VITE_RPC_URL)
    ])
  )
});
