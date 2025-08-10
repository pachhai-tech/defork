# Decentralized AI-Powered Creative Forking — MVP

Phase 1 MVP: Text & Image creation (human + client-side AI), IPFS storage, ERC-721 minting with ERC-2981 royalties, wallet connections (MetaMask, Coinbase, WalletConnect). Enhancements included: content SHA-256 hashing, drag-and-drop editor, and client-side NSFW filter.

## Contracts (Foundry)

```bash
cd contracts
forge init --force
forge install OpenZeppelin/openzeppelin-contracts

# Build & test
forge build
forge test -vv

# Deploy
cp .env.example .env
forge script script/Deploy.s.sol:Deploy --rpc-url $RPC_URL --broadcast -vvvv
```

Copy the printed `StoryForkNFT` address for the dApp.

## dApp (React + Vite)

```bash
cd dapp
cp .env.example .env

npm i
npm run dev
```

Open the local URL, connect a wallet, generate text/images locally, mint, and view in the Gallery.

### Notes

- **NSFW filter** uses `@tensorflow-models/nsfwjs` (runs client-side). It blocks images classified as Porn/Hentai/Sexy above 0.85 probability.
- **SHA-256** of the content is computed in-browser and stored as `contentHash` in metadata.
- **Drag-and-drop** accepts text or image files into the Create panel.
- **Local AI**:
  - Text: `@xenova/transformers` with a tiny instruct model.
  - Image: MLC WebGPU SD (requires WebGPU-capable browser). Fallback is human upload.

## Hedera EVM Quickstart

**Chain IDs**: Mainnet `295`, Testnet `296`, Previewnet `297`.  
**RPC (Hashio)**:

- Mainnet: `https://mainnet.hashio.io/api`
- Testnet: `https://testnet.hashio.io/api`
- Previewnet: `https://previewnet.hashio.io/api`  
  **Explorer**: HashScan (`https://hashscan.io/{network}`)

### Deploy (Foundry)

```bash
cd contracts
cp .env.example .env

forge build
forge script script/Deploy.s.sol:Deploy --rpc-url testnet --broadcast -vvvv
```

Copy the printed address into `dapp/.env` as `VITE_CONTRACT_ADDRESS`, set `VITE_CHAIN_ID` to `296` (testnet) or your target, and `VITE_RPC_URL` to the Hashio endpoint above.

### Verify contracts

Load environment variables

```bash
source .env
```

Verify StoryForkNFT contract:

```bash
forge verify-contract 0xAA31b224C46A9358d8536fc383dB6F2c6B58d8bC \
 src/StoryForkNFT.sol:StoryForkNFT \
 --chain-id 296 \
 --verifier sourcify \
 --verifier-url "https://server-verify.hashscan.io/" \
 --constructor-args $(cast abi-encode "constructor(address,uint96)" $ROYALTY_RECEIVER $DEFAULT_ROYALTY_BPS)
```

Verify ForkRegistry contract:

```bash
NFT_ADDR=0xAA31b224C46A9358d8536fc383dB6F2c6B58d8bC

forge verify-contract 0x950437A4F97F2832ACdad3795f4dF3011e9Ed378 \
  src/ForkRegistry.sol:ForkRegistry \
  --chain-id 296 \
  --verifier sourcify \
  --verifier-url https://server-verify.hashscan.io \
  --constructor-args $(cast abi-encode "constructor(address)" $NFT_ADDR)
```

### Explorer Links & Tx Tracking

- Each mint waits for the transaction receipt and parses the `GenesisCreated` event to get the `tokenId`.
- The app stores a local mapping of **tokenId → tx hash** in `localStorage` (`mintTxByTokenId`).
- The Gallery shows per-item **Mint tx** links using the active chain's explorer (HashScan on Hedera; others as configured).

### Toasts & UX

- Mint flow surfaces progress toasts (uploading, minting, confirming, success).
- Local AI panels show download/generation progress.

### On-chain + IPFS trace

- For each mint, a `tx_#.json` is pushed to IPFS containing `chainId`, `tokenId`, `txHash`, `blockNumber`, `timestamp`, and `metadataUri`.
- The Gallery links to this JSON for verifiable provenance.

### Forking (Phase-2 ready stubs)

- Each mint can include an optional `parentTokenId` in metadata.
- Gallery includes a **Fork** button that prefills the Create form with `parentTokenId` and a suggested title.

### On-chain content hash

- Contract now supports `setContentHash(tokenId, bytes32)` callable by the author/owner.
- The dApp auto-calls this after mint using the computed SHA-256.

### Minimal moderation

- Metadata includes `moderation.hidden` flag (opt-in at mint). The Gallery hides such items by default and offers a **Show hidden** toggle.
- A simple **Report** button writes a `report_#.json` to IPFS for off-chain review.

### Fork Explorer refresh & fallback

- After a successful `registerFork`, the dApp emits a `fork-graph-refresh` event and bumps a `forkGraphRefreshTick` counter in localStorage. The Fork Explorer listens and refreshes automatically.
- If on-chain logs are sparse/unavailable, the Explorer **falls back to metadata** by scanning `tokenURI` JSON and reading `parentTokenId` to reconstruct the tree.

### v8 Production Prep

- Added `PRODUCTION_CHECKLIST.md` covering deployment, performance, and security.
- Added `smoke-test.sh` to quickly validate contracts + dApp locally.
- Added IPFS redundancy + model caching tips in checklist.

## CI: IPFS auto-deploy on Release

When you publish a GitHub Release, the `Release IPFS Deploy` workflow:

1. Builds the dApp (`dapp/`)
2. Uploads `dist/` to **Web3.Storage**
3. Appends the **CID** and gateway link to the release body

### Secrets required

- `WEB3_STORAGE_TOKEN`: API token from web3.storage

### Manual trigger

You can also run the workflow via **Actions → Release IPFS Deploy → Run workflow**.

## CI: Fleek deploy (optional)

The `Release Fleek Deploy` workflow builds the dApp and publishes `dapp/dist` to **Fleek**.

### Required repo secrets

- `FLEEK_SITE_ID` – your Fleek site ID
- `FLEEK_API_KEY` – Fleek API key
- `FLEEK_API_SECRET` – Fleek API secret

> After creating a Release on GitHub, both **Release IPFS Deploy** and **Release Fleek Deploy** can run in parallel. Use Fleek to wire a custom domain (e.g., `app.yourdomain.com`) to the latest deployment.

## Custom Domain (Fleek) — DNS

See **docs/dns.md** for copy-ready records (YAML, Cloudflare TF, Route53 TF).  
Generate templates quickly:

```bash
node scripts/dns-template.mjs --domain yourdomain.com --sub app --target <FLEEK_EDGE_TARGET> [--txt <TXT_VERIFICATION_VALUE>]
```

## Admin Panel

`src/admin/AdminPanel.tsx` provides a gated UI for allowlisted addresses to toggle `moderationHidden` for a given token.

### Contract changes

Add `mapping(uint256=>bool) public moderationHidden` and `setModerationHidden(uint256,bool)` to `StoryForkNFT` with an allowlist or `onlyOwner`.

## Retry setContentHash utility

`scripts/retry-setContentHash.mjs` lets you batch-call `setContentHash` for token IDs missing it.

Usage:

```bash
RPC_URL=... PRIVATE_KEY=... STORYFORKNFT_ADDR=... node scripts/retry-setContentHash.mjs 1 10 Qm...
```

### Admin panel

- Contract now supports `setAdmin(address,bool)` (owner-only) and `setTokenURI(tokenId,newUri)` (author/owner/admin).
- Use `contracts/script/SetAdmin.s.sol` to grant admin:

```bash
export PRIVATE_KEY=0x...          # contract owner
export NFT_ADDRESS=0xYourStoryForkNFT
export ADMIN_ADDRESS=0xAdmin
forge script script/SetAdmin.s.sol:SetAdmin --rpc-url $RPC_URL --broadcast -vvvv
```

- Connect as an admin to see the **Admin Panel** in the dApp:
  - Hide/Unhide: toggles `moderation.hidden` by writing a new metadata JSON, signs a note, and updates `tokenURI` on-chain.
  - Retry contentHash: recomputes SHA-256 from content and calls `setContentHash` in batch.

### Role Manager + Audit Log

- **Role Manager** (owner-only): grant/revoke admins directly from the dApp (calls `setAdmin`).
- **Audit Log**: consolidates `GenesisCreated`, `TokenURIUpdated`, `ContentHashSet`, and `ForkRegistered` events with a manual refresh button.

### Docs site & Onboarding tour

- Static docs in `/docs` ship to GitHub Pages via CI. Open `/docs/index.html` locally or on Pages.
- dApp header includes **Docs** link and **Start Tour** button. First-time visitors see the tour automatically (stored in `localStorage`).

### Quickstart Checklist

- Visible to admins and first-time users at the top of the dashboard.
- Checks:
  - Required .env vars present
  - Contract reachable via RPC
  - Wallet connected
  - Web3.Storage token valid

### Quickstart Checklist (in-app)

Open the app and look for the **Quickstart Checklist** card at the top. It verifies:

- Env variables present (`.env`)
- Wallet connection
- RPC reachability
- Contract readability (`totalSupply`)
- Registry address format
  Use the **Re-run checks** button after editing `.env` or redeploying.

## Landing site (GitHub Pages)

A minimal marketing page is in `/landing` with CTAs to the dApp and docs, plus an optional waitlist form.

### Configure (repo secrets)

- `LANDING_DAPP_URL` – URL of your deployed dApp (Fleek/IPFS/etc)
- `LANDING_DOCS_URL` – URL to docs (or leave blank to use `/docs` on the same site)
- `LANDING_FORM_ENDPOINT` – optional webhook (Formspree, etc) that accepts `{ email, ts }` JSON

When you push changes under `landing/` or `docs/`, the **Landing (GitHub Pages)** workflow publishes the site and copies `docs/` into `/docs` under the landing domain.

### Landing status ribbon

The landing page fetches the latest GitHub Release and parses the body for a `CID: <cid>` line (added by the IPFS deploy workflow). It shows a ribbon with the tag and a direct IPFS link.  
No tokens required; it uses the public GitHub API and repo context from Actions.

## Legal + Analytics

- **Privacy** and **Terms** pages live under `/landing` and are linked in the header/footer.
- Optional cookie-free analytics via **Plausible**:
  - Landing: set repo secrets `PLAUSIBLE_DOMAIN` (e.g., `creativeforking.app`) and optionally `PLAUSIBLE_SCRIPT`.
  - dApp: set `.env` with `VITE_PLAUSIBLE_DOMAIN` and optionally `VITE_PLAUSIBLE_SCRIPT`.
  - If unset, no analytics script is injected.

## Press kit & reset utility

- **Press kit** lives under `/brand` with `logo.svg`, `social-card.svg`, and `palette.json`. Public page at `/landing/brand.html`.
- **Reset cache** button in the dApp header clears localStorage/sessionStorage, unregisters service workers, deletes caches and common IndexedDB stores, then reloads.

## About this build modal

- Opens from the dApp header.
- Shows `VITE_` env vars, commit, CID, and build date (from `/public/version.json`).
- `/public/version.json` is populated at build time by the CI workflow.

### “About this build” modal

- Opens from the header **About** link. Shows version, commit, build time, env/network snapshot, and contract/registry addresses.
- CI injects `VITE_APP_VERSION`, `VITE_BUILD_COMMIT`, `VITE_BUILD_TIME` during dApp builds so production builds are labeled.
