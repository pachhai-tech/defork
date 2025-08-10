import { Web3Storage, File } from 'web3.storage'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TOKEN = process.env.WEB3_STORAGE_TOKEN
if (!TOKEN) { console.error('Missing WEB3_STORAGE_TOKEN'); process.exit(1) }

const client = new Web3Storage({ token: TOKEN })

function walkDir(dir) {
  const files = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walkDir(full))
    else files.push(full)
  }
  return files
}

async function main() {
  const root = path.join(__dirname, '..', 'dist')
  if (!fs.existsSync(root)) { console.error('dist/ not found; build first'); process.exit(1) }
  const files = walkDir(root).map((fp) => {
    const rel = path.relative(root, fp).replace(/\\/g, '/')
    const content = fs.readFileSync(fp)
    return new File([content], rel)
  })
  const cid = await client.put(files, { wrapWithDirectory: false })
  console.log(cid)
  fs.writeFileSync(path.join(__dirname, 'cid.txt'), cid)
}

main().catch((e)=>{ console.error(e); process.exit(1) })
