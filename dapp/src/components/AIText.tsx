import { useToast } from '../context/ToastContext'
import { useState } from 'react'

export function AIText({ onResult }: { onResult: (text: string, modelId: string) => void }) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<number>(0)
  const [prompt, setPrompt] = useState('Write a 120-word scene about an IMF recruit test.')

  async function run() {
    setLoading(true)
    try {
      toast?.show?.({ message: 'Loading text model…', type: 'info' })
      const { pipeline } = await import('@xenova/transformers')
      const generator = await pipeline('text-generation', 'Xenova/llama-3.2-1B-instruct')
      const out = await generator(prompt, { max_new_tokens: 160, temperature: 0.9 })
      const text = Array.isArray(out) ? out[0].generated_text : String(out)
      onResult(text, 'llama-3.2-1B-instruct')
    } catch (e) {
      alert(`AI error: ${(e as Error).message}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-2">
      <textarea className="w-full border rounded p-2" rows={5} value={prompt} onChange={e=>setPrompt(e.target.value)} />
      <button className="px-3 py-1 border rounded" onClick={run} disabled={loading}>
        {loading ? 'Generating…' : 'Generate Text (Local)'}
      </button>
    </div>
  )
}
