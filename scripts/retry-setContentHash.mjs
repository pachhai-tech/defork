#!/usr/bin/env node
/**
 * Retry setContentHash for tokens missing contentHash
 * Usage: node scripts/retry-setContentHash.mjs <fromId> <toId> <hash>
 */
import { createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { abi as StoryForkNFT_ABI } from '../contracts/out/StoryForkNFT.sol/StoryForkNFT.json'

const rpc = process.env.RPC_URL
const key = process.env.PRIVATE_KEY
const contractAddr = process.env.STORYFORKNFT_ADDR

if (!rpc || !key || !contractAddr) {
  console.error('Set RPC_URL, PRIVATE_KEY, STORYFORKNFT_ADDR env vars')
  process.exit(1)
}
const args = process.argv.slice(2)
if (args.length < 3) {
  console.error('Usage: node scripts/retry-setContentHash.mjs <fromId> <toId> <hash>')
  process.exit(1)
}
const [fromId, toId, hash] = args

const account = privateKeyToAccount(key)
const client = createWalletClient({ account, transport: http(rpc) })

async function main() {
  for (let id = parseInt(fromId); id <= parseInt(toId); id++) {
    console.log('Setting contentHash for token', id)
    try {
      const tx = await client.writeContract({
        address: contractAddr,
        abi: StoryForkNFT_ABI,
        functionName: 'setContentHash',
        args: [BigInt(id), hash],
      })
      console.log('Tx', tx)
    } catch (e) {
      console.error('Error on token', id, e)
    }
  }
}
main()
