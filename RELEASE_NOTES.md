# Release Notes

## Highlights
- MVP dApp + Foundry contracts for StoryForkNFT + ForkRegistry
- Hedera EVM presets, multi-chain switcher, explorer links
- Local AI generation (text + image), NSFW filter, toasts, tx JSON on IPFS
- Fork Explorer with on-chain logs + metadata fallback
- Service worker for model caching; IPFS redundancy; rate limiting

## Deploy Checklist
- Update `.env` in `dapp/`
- Deploy contracts (Foundry)
- Tag version: `git tag v$(cat VERSION)` and push tags

