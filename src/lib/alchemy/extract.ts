// Kleuren uit een foto halen: k-means++ in OKLab. Draait in een worker, maar hier staat alleen de rekensom

import { deltaEOK, fromOklab, linearize, linearRgbToOklab, type Oklab } from './color'
import type { Pigment } from './ingredients'
import { mulberry32, weighted, type Random } from './prng'

export interface Samples {
  /** l, a, b achter elkaar */
  lab: Float32Array
  weight: Float32Array
  count: number
}

/** Felle pixels tellen zwaarder, anders wordt elk palet beige */
export const chromaWeight = (chroma: number) => 1 + 8 * Math.min(chroma, 0.3)

const LINEAR = Float32Array.from({ length: 256 }, (_, v) => linearize(v / 255))

/** Van RGBA-bytes (zoals uit een canvas) naar OKLab, met een gewicht per pixel. Doorzichtige pixels tellen niet mee */
export function samplesFromRgba(data: ArrayLike<number>): Samples {
  const pixels = Math.floor(data.length / 4)
  const lab = new Float32Array(pixels * 3)
  const weight = new Float32Array(pixels)
  let count = 0
  for (let p = 0; p < pixels; p++) {
    if (data[p * 4 + 3] < 128) continue
    const { l, a, b } = linearRgbToOklab(LINEAR[data[p * 4]], LINEAR[data[p * 4 + 1]], LINEAR[data[p * 4 + 2]])
    lab[count * 3] = l
    lab[count * 3 + 1] = a
    lab[count * 3 + 2] = b
    weight[count] = chromaWeight(Math.hypot(a, b))
    count++
  }
  return { lab, weight, count }
}

export interface Cluster {
  center: Oklab
  /** Aandeel van het totale gewicht, van 0 tot 1 */
  share: number
}

const distance2 = (lab: Float32Array, i: number, c: Oklab) => {
  const dl = lab[i * 3] - c.l
  const da = lab[i * 3 + 1] - c.a
  const db = lab[i * 3 + 2] - c.b
  return dl * dl + da * da + db * db
}

/** De eerste middelpunten, ver uit elkaar gekozen (k-means++) */
function seedCenters(random: Random, { lab, weight, count }: Samples, k: number): Oklab[] {
  const at = (i: number): Oklab => ({ l: lab[i * 3], a: lab[i * 3 + 1], b: lab[i * 3 + 2] })
  const centers = [at(weighted(random, Array.from(weight.subarray(0, count))))]
  const nearest = new Float64Array(count).fill(Infinity)
  while (centers.length < k) {
    const last = centers[centers.length - 1]
    const chances = new Array<number>(count)
    for (let i = 0; i < count; i++) {
      nearest[i] = Math.min(nearest[i], distance2(lab, i, last))
      chances[i] = nearest[i] * weight[i]
    }
    if (chances.every((c) => c === 0)) break
    centers.push(at(weighted(random, chances)))
  }
  return centers
}

/** Gewogen k-means in OKLab. Geeft de groepen, de grootste eerst */
export function kmeans(samples: Samples, k: number, seed: number, iterations = 16): Cluster[] {
  if (samples.count === 0) return []
  const random = mulberry32(seed)
  const { lab, weight, count } = samples
  let centers = seedCenters(random, samples, Math.min(k, count))
  const owner = new Int32Array(count)
  let shares: number[] = []
  for (let round = 0; round < iterations; round++) {
    const sums = centers.map(() => ({ l: 0, a: 0, b: 0, w: 0 }))
    let changed = false
    for (let i = 0; i < count; i++) {
      let best = 0
      let bestD = Infinity
      for (let c = 0; c < centers.length; c++) {
        const d = distance2(lab, i, centers[c])
        if (d < bestD) {
          bestD = d
          best = c
        }
      }
      if (owner[i] !== best) changed = true
      owner[i] = best
      const s = sums[best]
      const w = weight[i]
      s.l += lab[i * 3] * w
      s.a += lab[i * 3 + 1] * w
      s.b += lab[i * 3 + 2] * w
      s.w += w
    }
    centers = sums.map((s, c) => (s.w > 0 ? { l: s.l / s.w, a: s.a / s.w, b: s.b / s.w } : centers[c]))
    const total = sums.reduce((t, s) => t + s.w, 0)
    shares = sums.map((s) => s.w / total)
    if (!changed && round > 0) break
  }
  return centers.map((center, i) => ({ center, share: shares[i] ?? 0 })).filter((c) => c.share > 0).sort((a, b) => b.share - a.share)
}

/** De pigmenten van een foto: de grootste groepen, maar geen twee die bijna hetzelfde zijn */
export function photoPigments(samples: Samples, seed: number, count = 4): Pigment[] {
  const clusters = kmeans(samples, 7, seed)
  const chosen: Cluster[] = []
  for (const cluster of clusters) {
    if (chosen.length >= count) break
    if (chosen.every((c) => deltaEOK(c.center, cluster.center) >= 0.06)) chosen.push(cluster)
  }
  // Een effen plaatje heeft maar één kleur. Een ingrediënt heeft er minstens twee
  while (chosen.length < 2 && clusters.length) chosen.push(clusters[chosen.length] ?? clusters[0])
  return chosen.map(({ center, share }) => {
    const color = fromOklab(center)
    return {
      color: { l: Math.min(1, Math.max(0, color.l)), c: Math.min(0.37, color.c), h: color.h },
      weight: Math.max(0.1, Math.round(share * 100) / 10),
    }
  })
}
