import { getAddress } from "viem";

export const CONTRACT_ADDRESS = getAddress(
  import.meta.env.VITE_CONTRACT_ADDRESS
);
export const ABI = [
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
    name: "GenesisCreated",
    inputs: [
      { indexed: true, name: "tokenId", type: "uint256" },
      { indexed: true, name: "author", type: "address" },
      { indexed: false, name: "tokenURI", type: "string" }
    ],
    anonymous: false
  },
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
  }
] as const;
