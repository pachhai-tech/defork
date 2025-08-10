
# Architecture Diagram

```mermaid
flowchart TD
    subgraph User Browser
        UI[React Frontend]
        AI[Local AI Models<br/>(WebGPU/WebAssembly)]
        Wallet[Web3 Wallet Integration]
        StorageClient[IPFS Client]
        Moderation[Local Moderation Filters]
    end

    subgraph Blockchain[Hedera EVM / EVM-compatible Chain]
        NFT[StoryForkNFT Contract]
        Registry[ForkRegistry Contract]
    end

    subgraph DecentralizedStorage[IPFS Network]
        Metadata[JSON Metadata<br/>(authorship, royalties, provenance)]
        Content[Creative Content<br/>(text, images, audio)]
        Models[AI Model Assets<br/>(optional IPFS mirror)]
    end

    UI -->|wallet tx| NFT
    UI -->|wallet tx| Registry
    UI --> StorageClient
    AI --> UI
    Moderation --> UI

    NFT -->|tokenURI| Metadata
    Metadata --> Content
    StorageClient --> Metadata
    StorageClient --> Content

    AI --> Models
    Models --> AI
```

This diagram shows:
- **User Browser**: Runs the entire dApp frontend, AI inference, moderation.
- **Blockchain**: Holds smart contracts for NFTs and fork registry.
- **IPFS**: Stores all content, metadata, and optionally AI model artifacts.
