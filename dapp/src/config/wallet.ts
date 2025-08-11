import { http, createConfig } from "wagmi";
import {
  walletConnect,
  injected,
  metaMask,
  coinbaseWallet
} from "wagmi/connectors";
import type { Chain } from "viem";
import { defineChain } from "viem";

const HEDERA_TESTNET_ID = Number(import.meta.env.VITE_CHAIN_ID || 296);
const RPC_URL = String(
  import.meta.env.VITE_RPC_URL || "https://testnet.hashio.io/api"
);
const WC_PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;

export const hederaTestnet = defineChain({
  id: HEDERA_TESTNET_ID, // 296
  name: "Hedera Testnet",
  nativeCurrency: { name: "HBAR", symbol: "HBAR", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } }
}) as Chain;

export const CHAINS = [hederaTestnet] as [Chain, ...Chain[]];

export const config = createConfig({
  chains: CHAINS,
  transports: {
    [hederaTestnet.id]: http(RPC_URL)
  },
  connectors: [
    // Prefer MetaMask over generic injected when present
    metaMask(),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: "Defork MVP"
    }),
    ...(WC_PROJECT_ID
      ? [
          walletConnect({
            projectId: WC_PROJECT_ID as string,
            showQrModal: true,
            metadata: {
              name: "Defork MVP",
              description: "Decentralized Creative Forking",
              url:
                (typeof window !== "undefined" && window.location?.origin) ||
                "https://example.org",
              icons: [
                "https://raw.githubusercontent.com/pachhai-tech/defork/main/dapp/public/icon-192.png"
              ]
            }
          })
        ]
      : [])
  ]
});
