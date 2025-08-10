# Creative Forking Platform — Full Handbook

# Decentralized AI-Powered Creative Forking Platform

## Overview
The platform enables collaborative storytelling, art, and other creative media without a centralized backend. Users can create, fork, and evolve works—either manually or with local AI models—in a verifiable, on-chain economy.

## Core Principles
- **True Decentralization**: No centralized servers for content, metadata, or core logic.
- **Client-Side AI Inference**: Models run locally in the browser (WebAssembly/WebGPU).
- **Verifiable Provenance & Attribution**: On-chain lineage for all contributions.
- **Community-Driven Evolution**: NFT-stake-based voting and royalties.
- **Multichain Ecosystem**: Deployable to multiple EVM-compatible chains.

## Key Phase-1 Features
- Hedera EVM deployment
- Text & image content creation (human or AI)
- Forkable NFTs with lineage
- IPFS storage
- Basic royalties (ERC-2981 default)
- Basic moderation (client-side)

---

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

---

# Smart Contracts

## StoryForkNFT
- ERC-721 NFT representing creative works.
- Stores IPFS tokenURI and on-chain content hash.
- Implements ERC-2981 royalties.

## ForkRegistry
- Maps NFT forks to parent IDs.
- Enables lineage tracking.

## Deployment
- Contracts deployed with Foundry to Hedera EVM.
- Addresses recorded in docs and .env.

---

# Running the Platform

## Prerequisites
- Node.js 20+
- pnpm or npm
- Foundry
- Wallet (MetaMask)

## Local Development
```bash
pnpm install
pnpm dev
```

## Deploy to Testnet
1. Deploy contracts via Foundry scripts.
2. Set contract addresses in `.env`.
3. `pnpm build` and deploy `/dist` to IPFS.

## Production Deploy
- Use Release IPFS Deploy workflow (GitHub Actions).
- Optional Fleek deploy for stable domain.

## Strict No-Backend Mode
- Unset analytics env vars.
- Mirror model assets to IPFS and set `VITE_MODEL_BASE_IPFS`.

---

# Deployment Guide

## Hedera EVM
- Use provided RPC URL.
- Deploy contracts with Foundry scripts.
- Mint test NFTs to verify functionality.

## Multi-Chain
- Use CREATE2 for deterministic contract addresses.
- Repeat deploy process for each EVM-compatible chain.

---

# Moderation

## Client-Side
- Local NSFW filter (runs in browser).
- User mute/block list stored locally.

## On-Chain
- Admin hide/unhide flag for NFTs.
- Metadata `moderation.hidden` key respected by frontend.

No central server is involved in moderation.

---

