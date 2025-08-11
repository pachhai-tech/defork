import { createConfig, http } from "wagmi";
import { defineChain } from "viem";
import { getDefaultConfig } from "connectkit";

// Env
const HEDERA_TESTNET_ID = Number(import.meta.env.VITE_CHAIN_ID || 296);
const RPC_URL = String(
  import.meta.env.VITE_RPC_URL || "https://testnet.hashio.io/api"
);
const WC_PROJECT_ID = String(
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || ""
);

// Custom Hedera Testnet chain
export const hederaTestnet = defineChain({
  id: HEDERA_TESTNET_ID,
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } }
});

export const CHAINS = [hederaTestnet] as const;

export const config = createConfig(
  getDefaultConfig({
    // App metadata (used by WalletConnect)
    appName: "Defork MVP",
    appDescription: "Decentralized Creative Forking",
    appUrl:
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://example.org",
    appIcon:
      "https://raw.githubusercontent.com/pachhai-tech/defork/main/dapp/public/icon-192.png",

    // Chains + transports
    chains: CHAINS,
    transports: {
      [hederaTestnet.id]: http(RPC_URL)
    },

    // WalletConnect
    walletConnectProjectId: WC_PROJECT_ID || "00000000000000000000000000000000",

    // If SSR ever used, set to true and hydrate props correctly. For Vite SPA keep false.
    ssr: false
  })
);
