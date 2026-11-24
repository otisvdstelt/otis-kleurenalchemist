// Een foto in de ketel: verkleinen, dan in een worker de kleuren eruit halen. De foto verlaat het apparaat nooit

import type { PhotoResult } from '../workers/photo.worker'
import { toHex, type Hex } from './alchemy/color'
import type { Pigment } from './alchemy/ingredients'

/** Zo groot (de langste kant) gaat de foto de worker in. Meer is niet nodig voor een palet */
const SIDE = 160

export interface Photo {
  id: string
  pigments: Pigment[]
  /** De pigmenten als hexwaarde, voor de pipet */
  hexes: Hex[]
  /** Een blob-URL van het kleine plaatje */
  url: string
}

/** HEIC en HEIF, het standaardformaat van een iPhone. Alleen Safari kan ze lezen */
export const isHeic = (file: File) => /image\/hei[cf]/.test(file.type) || /\.hei[cf]$/i.test(file.name)

export const isImage = (file: File | null | undefined): file is File => Boolean(file && (file.type.startsWith('image/') || isHeic(file)))

/** Lees de foto en geef zijn pigmenten terug */
export async function readPhoto(file: Blob): Promise<Photo> {
  const full = await createImageBitmap(file)
  const scale = Math.min(1, SIDE / Math.max(full.width, full.height))
  const small = await createImageBitmap(full, { resizeWidth: Math.max(1, Math.round(full.width * scale)), resizeHeight: Math.max(1, Math.round(full.height * scale)), resizeQuality: 'medium' })
  full.close()
  const worker = new Worker(new URL('../workers/photo.worker.ts', import.meta.url), { type: 'module' })
  try {
    const result = await new Promise<PhotoResult>((resolve, reject) => {
      worker.onmessage = ({ data }: MessageEvent<PhotoResult | { error: string }>) => ('error' in data ? reject(new Error(data.error)) : resolve(data))
      worker.onerror = (event) => reject(new Error(event.message))
      worker.postMessage({ bitmap: small }, [small])
    })
    return { id: result.id, pigments: result.pigments, hexes: result.pigments.map((p) => toHex(p.color)), url: URL.createObjectURL(result.thumb) }
  } finally {
    worker.terminate()
  }
}
