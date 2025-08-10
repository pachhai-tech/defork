import * as nsfwjs from '@tensorflow-models/nsfwjs'
import * as tf from '@tensorflow/tfjs'

let _model: nsfwjs.NSFWJS | null = null

export async function loadNSFW() {
  if (_model) return _model
  // Loads a small model to keep it light; hosted by the package
  _model = await nsfwjs.load()
  return _model
}

export async function isImageSafe(blob: Blob, threshold = 0.85): Promise<{safe: boolean, scores: any[]}> {
  const img = await createImageBitmap(await blob.arrayBuffer()).then((bmp) => {
    const canvas = document.createElement('canvas')
    canvas.width = bmp.width; canvas.height = bmp.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bmp, 0, 0)
    return canvas
  })

  const model = await loadNSFW()
  const preds = await model.classify(img)
  // Flag unsafe if Porn or Hentai or Sexy exceeds threshold
  const unsafe = preds.some(p => ['Porn','Hentai','Sexy'].includes(p.className) && p.probability >= threshold)
  return { safe: !unsafe, scores: preds }
}
