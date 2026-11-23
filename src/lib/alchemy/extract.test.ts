import { describe, expect, it } from 'vitest'
import { deltaEOK, fromHex, hexToOklab, hexToRgb } from './color'
import { kmeans, photoPigments, samplesFromRgba } from './extract'
import { mulberry32 } from './prng'

/** Een synthetisch plaatje: vlakken in deze kleuren, met wat ruis, als RGBA-bytes */
function picture(blocks: { hex: string; pixels: number }[], noise = 6, seed = 1): Uint8ClampedArray {
  const random = mulberry32(seed)
  const total = blocks.reduce((sum, b) => sum + b.pixels, 0)
  const data = new Uint8ClampedArray(total * 4)
  let p = 0
  for (const { hex, pixels } of blocks) {
    const [r, g, b] = hexToRgb(hex).map((v) => v * 255)
    for (let i = 0; i < pixels; i++, p++) {
      data[p * 4] = r + (random() - 0.5) * noise
      data[p * 4 + 1] = g + (random() - 0.5) * noise
      data[p * 4 + 2] = b + (random() - 0.5) * noise
      data[p * 4 + 3] = 255
    }
  }
  return data
}

describe('k-means in OKLab', () => {
  const blocks = [
    { hex: '#c0392b', pixels: 2000 },
    { hex: '#2e86c1', pixels: 1500 },
    { hex: '#f4ecd8', pixels: 3000 },
  ]

  it('vindt de vlakken in een synthetisch plaatje terug', () => {
    const clusters = kmeans(samplesFromRgba(picture(blocks)), 3, 42)
    expect(clusters).toHaveLength(3)
    for (const { hex } of blocks) {
      const target = hexToOklab(hex)
      const nearest = Math.min(...clusters.map((c) => deltaEOK(c.center, target)))
      expect(nearest, hex).toBeLessThan(0.02)
    }
    expect(clusters.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 6)
  })

  it('is deterministisch voor dezelfde seed', () => {
    const samples = samplesFromRgba(picture(blocks))
    expect(kmeans(samples, 4, 7)).toEqual(kmeans(samples, 4, 7))
  })

  it('slaat doorzichtige pixels over', () => {
    const data = picture([{ hex: '#00ff00', pixels: 10 }])
    for (let i = 0; i < 10; i++) data[i * 4 + 3] = 0
    expect(samplesFromRgba(data).count).toBe(0)
    expect(kmeans(samplesFromRgba(data), 3, 1)).toEqual([])
  })
})

describe('photoPigments', () => {
  it('laat een kleine felle vlek niet verdwijnen in het beige', () => {
    const pigments = photoPigments(samplesFromRgba(picture([
      { hex: '#e8dcc4', pixels: 4000 },
      { hex: '#d9c9a8', pixels: 3000 },
      { hex: '#c8b48e', pixels: 2200 },
      { hex: '#d7263d', pixels: 500 },
    ])), 3)
    const red = fromHex('#d7263d')
    expect(Math.min(...pigments.map((p) => deltaEOK(p.color, red)))).toBeLessThan(0.05)
  })

  it('geeft 2 tot 4 pigmenten, ook bij een effen plaatje', () => {
    const flat = photoPigments(samplesFromRgba(picture([{ hex: '#3b533e', pixels: 500 }], 0)), 1)
    expect(flat.length).toBeGreaterThanOrEqual(2)
    const busy = photoPigments(samplesFromRgba(picture([
      { hex: '#c0392b', pixels: 800 },
      { hex: '#2e86c1', pixels: 800 },
      { hex: '#f1c40f', pixels: 800 },
      { hex: '#27ae60', pixels: 800 },
      { hex: '#8e44ad', pixels: 800 },
      { hex: '#ecf0f1', pixels: 800 },
    ])), 1)
    expect(busy).toHaveLength(4)
    for (const p of busy) expect(p.weight).toBeGreaterThan(0)
  })
})
