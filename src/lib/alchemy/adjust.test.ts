import { describe, expect, it } from 'vitest'
import { adjust, swapRoles } from './adjust.ts'
import { fromHex } from './color.ts'

const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)

describe('adjust', () => {
  const green = '#4d781a'

  it('maakt lichter en donkerder, met dezelfde tint', () => {
    expect(fromHex(adjust(green, 'lichter')).l).toBeGreaterThan(fromHex(green).l + 0.03)
    expect(fromHex(adjust(green, 'donkerder')).l).toBeLessThan(fromHex(green).l - 0.03)
    expect(hueGap(fromHex(adjust(green, 'lichter')).h, fromHex(green).h)).toBeLessThan(3)
  })

  it('draait warmer naar oranje en koeler naar blauw', () => {
    const h = fromHex(green).h
    expect(hueGap(fromHex(adjust(green, 'warmer')).h, 55)).toBeLessThan(hueGap(h, 55))
    expect(hueGap(fromHex(adjust(green, 'koeler')).h, 245)).toBeLessThan(hueGap(h, 245))
  })

  it('geeft grijs een tint als het warmer of koeler moet', () => {
    expect(fromHex(adjust('#808080', 'warmer')).c).toBeGreaterThan(0.01)
    expect(hueGap(fromHex(adjust('#808080', 'koeler')).h, 245)).toBeLessThan(20)
  })

  it('maakt feller en doffer', () => {
    expect(fromHex(adjust(green, 'feller')).c).toBeGreaterThan(fromHex(green).c)
    expect(fromHex(adjust(green, 'doffer')).c).toBeLessThan(fromHex(green).c)
  })

  it('blijft binnen sRGB, ook als het niet feller kan', () => {
    expect(adjust('#00ff00', 'feller')).toMatch(/^#[0-9a-f]{6}$/)
    expect(adjust('#ffffff', 'lichter')).toBe('#ffffff')
  })
})

describe('swapRoles', () => {
  it('wisselt twee kleuren van rol, en de rollen blijven op hun plek', () => {
    const before = [
      { hex: '#ffffff', role: 'achtergrond' as const },
      { hex: '#000000', role: 'tekst' as const },
      { hex: '#ff0000', role: 'accent' as const },
    ]
    const after = swapRoles(before, 0, 2)
    expect(after.map((s) => s.role)).toEqual(['achtergrond', 'tekst', 'accent'])
    expect(after.map((s) => s.hex)).toEqual(['#ff0000', '#000000', '#ffffff'])
    expect(swapRoles(before, 1, 1)).toEqual(before)
  })
})
