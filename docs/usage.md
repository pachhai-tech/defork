
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
