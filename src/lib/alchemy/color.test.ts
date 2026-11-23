import { describe, expect, it } from 'vitest'
import { deltaEOK, fromHex, hexToOklab, inGamut, isHex, lerpHue, linearRgbToOklab, linearize, meanHue, oklabToLinearRgb, toHex } from './color.ts'

describe('hex en OKLCH', () => {
  it('gaat heen en terug', () => {
    for (const hex of ['#3b533e', '#b8623b', '#f7f4eb', '#2c2823', '#a3c1ad', '#000000', '#ffffff']) {
      expect(toHex(fromHex(hex))).toBe(hex)
    }
  })

  it('kent wit en zwart', () => {
    expect(fromHex('#ffffff').l).toBeCloseTo(1, 3)
    expect(fromHex('#000000').l).toBeCloseTo(0, 3)
    expect(isHex('#abcdef')).toBe(true)
    expect(isHex('#ABCDEF')).toBe(false)
    expect(isHex('abcdef')).toBe(false)
  })
})

describe('gamut mapping', () => {
  it('houdt lichtheid en tint vast en laat de chroma zakken', () => {
    // Een groen dat veel feller is dan sRGB kan tonen
    const wild = { l: 0.8, c: 0.4, h: 145 }
    const tame = inGamut(wild)
    expect(tame.c).toBeLessThan(wild.c)
    expect(tame.l).toBeCloseTo(wild.l, 1)
    expect(Math.abs(tame.h - wild.h)).toBeLessThan(4)
    expect(isHex(toHex(wild))).toBe(true)
  })

  it('laat een kleur die al past met rust', () => {
    const calm = { l: 0.6, c: 0.05, h: 200 }
    expect(inGamut(calm).c).toBeCloseTo(0.05, 3)
  })
})

describe('OKLab', () => {
  it('de snelle omzetting komt overeen met culori', () => {
    const hex = '#b8623b'
    const [r, g, b] = [0xb8, 0x62, 0x3b].map((v) => linearize(v / 255))
    const fast = linearRgbToOklab(r, g, b)
    const slow = hexToOklab(hex)
    expect(deltaEOK(fast, slow)).toBeLessThan(1e-4)
    const back = oklabToLinearRgb(fast)
    expect(back[0]).toBeCloseTo(r, 4)
  })

  it('meet geen verschil tussen een kleur en zichzelf', () => {
    expect(deltaEOK(fromHex('#3b533e'), fromHex('#3b533e'))).toBe(0)
    expect(deltaEOK(fromHex('#000000'), fromHex('#ffffff'))).toBeCloseTo(1, 2)
  })
})

describe('tinten', () => {
  it('neemt het gemiddelde over de cirkel', () => {
    const h = meanHue([
      { color: { l: 0.5, c: 0.1, h: 350 }, weight: 1 },
      { color: { l: 0.5, c: 0.1, h: 10 }, weight: 1 },
    ])
    expect(Math.min(h, 360 - h)).toBeLessThan(1e-6)
  })

  it('draait de korte kant op', () => {
    expect(lerpHue(350, 10, 0.5)).toBeCloseTo(0, 6)
    expect(lerpHue(10, 350, 0.5)).toBeCloseTo(0, 6)
  })
})
