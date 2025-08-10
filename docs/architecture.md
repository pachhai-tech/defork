
# Architecture

## No-Backend Model
The app is a static frontend hosted on IPFS/Fleek. There is no traditional server; all state and logic are on-chain or in the user's browser.

## Components
- **Frontend**: React + Vite app served from IPFS.
- **Smart Contracts**: Solidity, deployed via Foundry.
- **Storage**: IPFS for content and metadata.
- **Wallet Integration**: wagmi/viem for MetaMask, Coinbase, WalletConnect.
- **Local AI**: Models loaded via WebGPU/WebAssembly.

## Contracts
- **StoryForkNFT**: ERC-721 + ERC-2981 royalties + content hash.
- **ForkRegistry**: Tracks parent-child relationships and fork lineage.
