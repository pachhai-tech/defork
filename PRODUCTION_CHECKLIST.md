# Production Release Checklist

## Pre-Deployment
- [ ] Verify `.env` has correct chain IDs, RPC URLs, and deployed addresses for StoryForkNFT + ForkRegistry.
- [ ] Run `forge test` with 100% pass rate on contracts.
- [ ] Deploy contracts to target network (`forge script ... --broadcast --verify`).
- [ ] Update dApp `.env` and rebuild.

## Performance
- [ ] Enable model caching: pre-download and cache browser AI models via Service Worker or IndexedDB.
- [ ] Reduce IPFS fetch latency: pin assets to multiple gateways (`ipfs.io`, `nftstorage.link`, `dweb.link`).
- [ ] Use Web3.Storage/Filecoin redundancy: store metadata in at least two pinning services.

## Security
- [ ] Check contract permissions (onlyOwner, public functions).
- [ ] Review royalty distribution math and prevent overflow/underflow.
- [ ] Test moderation flow for spam/abuse edge cases.

## Launch
- [ ] Run `npm run build` in `/dapp` and serve from IPFS via Fleek/Pinata.
- [ ] Smoke test wallet connect, mint, fork, vote, and explorer features.
