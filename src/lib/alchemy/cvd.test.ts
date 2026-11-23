import { describe, expect, it } from 'vitest'
import { deltaEOK, fromHex } from './color'
import { confusions, simulate, VISIONS } from './cvd'

describe('simulate', () => {
  it('laat grijs grijs', () => {
    for (const vision of VISIONS) {
      for (const hex of ['#000000', '#ffffff', '#777777']) {
        expect(deltaEOK(fromHex(simulate(hex, vision)), fromHex(hex))).toBeLessThan(0.01)
      }
    }
  })

  it('laat rood en groen op elkaar lijken bij deuteranopie en protanopie', () => {
    const red = '#d0402a'
    const green = '#5a8a2a'
    const normal = deltaEOK(fromHex(red), fromHex(green))
    for (const vision of ['deuteranopie', 'protanopie'] as const) {
      const seen = deltaEOK(fromHex(simulate(red, vision)), fromHex(simulate(green, vision)))
      expect(seen).toBeLessThan(normal / 2)
    }
  })

  it('laat blauw en groen op elkaar lijken bij tritanopie', () => {
    const blue = '#3a7fd0'
    const green = '#3aa088'
    const normal = deltaEOK(fromHex(blue), fromHex(green))
    const seen = deltaEOK(fromHex(simulate(blue, 'tritanopie')), fromHex(simulate(green, 'tritanopie')))
    expect(seen).toBeLessThan(normal / 2)
  })
})

describe('confusions', () => {
  it('waarschuwt als een accent en het signaal samenvallen', () => {
    const palette = [
      { hex: '#f7f4eb', role: 'achtergrond' as const },
      { hex: '#ebe4d0', role: 'oppervlak' as const },
      { hex: '#2c2823', role: 'tekst' as const },
      { hex: '#c2492b', role: 'accent' as const },
      { hex: '#6b8a1f', role: 'signaal' as const },
    ]
    const found = confusions(palette, 'deuteranopie')
    expect(found.some((c) => c.roles.includes('accent') && c.roles.includes('signaal'))).toBe(true)
    // Achtergrond en oppervlak liggen expres dicht bij elkaar
    expect(found.some((c) => c.roles.includes('achtergrond') && c.roles.includes('oppervlak'))).toBe(false)
  })

  it('zwijgt bij een palet dat op lichtheid uit elkaar ligt', () => {
    const palette = [
      { hex: '#ffffff', role: 'achtergrond' as const },
      { hex: '#000000', role: 'tekst' as const },
      { hex: '#888888', role: 'accent' as const },
    ]
    for (const vision of VISIONS) expect(confusions(palette, vision)).toEqual([])
  })
})
