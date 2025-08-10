# Deployment Guide

## Hedera EVM

- Use provided RPC URL.
- Deploy contracts with Foundry scripts.
- Mint test NFTs to verify functionality.

## Multi-Chain

- Use CREATE2 for deterministic contract addresses.
- Repeat deploy process for each EVM-compatible chain.

Set `VITE_NFTSTORAGE_TOKEN` for uploads. For production, use project-scoped keys and rotate when needed. No backend required.
