import { getAddress } from 'viem'

export const REGISTRY_ADDRESS = getAddress(import.meta.env.VITE_REGISTRY_ADDRESS)
export const REGISTRY_ABI = [
  { "type":"event","name":"ForkRegistered","inputs":[
      {"indexed":true,"name":"parentTokenId","type":"uint256"},
      {"indexed":true,"name":"childTokenId","type":"uint256"},
      {"indexed":true,"name":"caller","type":"address"}], "anonymous": false },
  { "type":"function","name":"registerFork","stateMutability":"nonpayable",
    "inputs":[{"name":"parentTokenId","type":"uint256"},{"name":"childTokenId","type":"uint256"}],"outputs":[] },
  { "type":"function","name":"getChildren","stateMutability":"view","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"type":"uint256[]"}] },
  { "type":"function","name":"getParent","stateMutability":"view","inputs":[{"name":"tokenId","type":"uint256"}],"outputs":[{"type":"uint256"}] }
] as const
