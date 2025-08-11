import { getAddress } from "viem";

// Contract addresses (using NFT_ADDRESS naming convention)
export const NFT_ADDRESS = getAddress(import.meta.env.VITE_NFT_ADDRESS);

export const REGISTRY_ADDRESS = getAddress(
  import.meta.env.VITE_REGISTRY_ADDRESS
);

export const ROYALTY_MANAGER_ADDRESS = getAddress(
  import.meta.env.VITE_ROYALTY_MANAGER_ADDRESS
);

export const VOTING_POOL_ADDRESS = getAddress(
  import.meta.env.VITE_VOTING_POOL_ADDRESS
);

// Token addresses
export const USDC_ADDRESS = getAddress(import.meta.env.VITE_USDC_ADDRESS);

export const WETH_ADDRESS = getAddress(import.meta.env.VITE_WETH_ADDRESS);

// Backward compatibility - export old names too
export const CONTRACT_ADDRESS = NFT_ADDRESS;

// Supported tokens configuration
export const SUPPORTED_TOKENS = [
  {
    address: USDC_ADDRESS,
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin"
  },
  {
    address: WETH_ADDRESS,
    symbol: "HBAR",
    decimals: 18,
    name: "Hedera HBAR"
  }
] as const;

// Updated NFT ABI with all functions
export const NFT_ABI = [
  // Events
  {
    type: "event",
    name: "GenesisCreated",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "author", type: "address" },
      { indexed: false, name: "tokenURI", type: "string" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "TokenURIUpdated",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "newTokenURI", type: "string" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ContentHashSet",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: false, name: "contentHash", type: "bytes32" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" }
    ],
    anonymous: false
  },
  // Functions
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "uri", type: "string" },
      { name: "royaltyReceiver", type: "address" },
      { name: "royaltyBps", type: "uint96" },
      { name: "cType", type: "uint8" },
      { name: "kType", type: "uint8" },
      { name: "modelId", type: "string" }
    ],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "totalSupply",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }]
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "setContentHash",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "contentHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setAdmin",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "allowed", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setTokenUri",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "newUri", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }]
  },
  {
    type: "function",
    name: "isAdmin",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "bool" }]
  },
  {
    type: "function",
    name: "contentHashOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "bytes32" }]
  },
  {
    type: "function",
    name: "provenance",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "author", type: "address" },
      { name: "contentType", type: "uint8" },
      { name: "contributionType", type: "uint8" },
      { name: "modelId", type: "string" }
    ]
  }
] as const;

// Backward compatibility
export const ABI = NFT_ABI;

// Registry ABI
export const REGISTRY_ABI = [
  {
    type: "event",
    name: "ForkRegistered",
    inputs: [
      { indexed: true, name: "parentTokenId", type: "uint256" },
      { indexed: true, name: "childTokenId", type: "uint256" },
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "cost", type: "uint256" }
    ],
    anonymous: false
  },
  {
    type: "function",
    name: "registerFork",
    stateMutability: "payable",
    inputs: [
      { name: "parentTokenId", type: "uint256" },
      { name: "childTokenId", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "parentOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "getChildren",
    stateMutability: "view",
    inputs: [{ name: "parentTokenId", type: "uint256" }],
    outputs: [{ type: "uint256[]" }]
  },
  {
    type: "function",
    name: "getParent",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "calculateForkCost",
    stateMutability: "view",
    inputs: [{ name: "parentTokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }]
  },
  {
    type: "function",
    name: "getForkDepth",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "uint256" }]
  }
] as const;

// Voting Pool ABI
export const VOTING_POOL_ABI = [
  {
    type: "event",
    name: "VoteCast",
    inputs: [
      { indexed: true, name: "voter", type: "address" },
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "votes", type: "uint256" },
      { indexed: false, name: "voterTier", type: "uint8" }
    ],
    anonymous: false
  },
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "token", type: "address" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "getTokenStats",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      { name: "votes", type: "uint256" },
      { name: "totalValue", type: "uint256" }
    ]
  },
  {
    type: "function",
    name: "getVoterTier",
    stateMutability: "view",
    inputs: [{ name: "voter", type: "address" }],
    outputs: [{ name: "tier", type: "uint8" }]
  }
] as const;

// ERC20 ABI for token interactions
export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "success", type: "bool" }]
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "amount", type: "uint256" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  }
] as const;
