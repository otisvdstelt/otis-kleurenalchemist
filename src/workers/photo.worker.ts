// Haalt de kleuren uit een foto, buiten de hoofdthread, zodat de pagina blijft lopen.
// De foto komt hier al verkleind binnen, en gaat nergens anders heen

import { photoPigments, samplesFromRgba } from '../lib/alchemy/extract'
import type { Pigment } from '../lib/alchemy/ingredients'
import { hash } from '../lib/alchemy/prng'

export interface PhotoRequest {
  bitmap: ImageBitmap
}

export interface PhotoResult {
  id: string
  pigments: Pigment[]
  /** Een klein plaatje voor het kaartje dat in de ketel valt */
  thumb: Blob
}

const scope = self as unknown as { onmessage: ((event: MessageEvent<PhotoRequest>) => void) | null; postMessage: (message: PhotoResult | { error: string }) => void }

scope.onmessage = async ({ data: { bitmap } }) => {
  try {
    const { width, height } = bitmap
    const canvas = new OffscreenCanvas(width, height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('geen 2d-context')
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const { data } = context.getImageData(0, 0, width, height)
    // Dezelfde foto geeft dezelfde seed, en dus dezelfde pigmenten
    let fingerprint = `${width}x${height}`
    for (let i = 0; i < data.length; i += 997) fingerprint += String.fromCharCode(data[i])
    const seed = hash(fingerprint)
    const pigments = photoPigments(samplesFromRgba(data), seed)
    const thumb = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.82 })
    scope.postMessage({ id: `foto-${seed.toString(36)}`, pigments, thumb })
  } catch (error) {
    scope.postMessage({ error: error instanceof Error ? error.message : String(error) })
  }
}
