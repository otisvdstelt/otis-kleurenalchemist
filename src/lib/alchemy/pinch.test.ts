import { describe, expect, it } from 'vitest'
import { checkPalette } from './contrast.ts'
import { fromHex, toHex } from './color.ts'
import { rolesFor, type Swatch } from './palette.ts'
import { pinch } from './pinch.ts'
import { mulberry32 } from './prng.ts'

const palette = (hexes: string[]): Swatch[] => {
  const roles = rolesFor(hexes.length)
  return hexes.map((hex, i) => ({ hex, role: roles[i] }))
}

describe('pinch', () => {
  it('laat een palet dat al leesbaar is met rust', () => {
    const good = palette(['#f7f4eb', '#ebe4d0', '#2c2823', '#8f4526', '#3b533e'])
    const result = pinch(good)
    expect(result.changed).toEqual([])
    expect(result.swatches).toEqual(good)
  })

  it('brengt elk paar boven de drempel, ook bij willekeurige paletten', () => {
    const random = mulberry32(2026)
    for (let run = 0; run < 300; run++) {
      const size = 3 + Math.floor(random() * 5)
      const hexes = Array.from({ length: size }, () => toHex({ l: random(), c: random() * 0.25, h: random() * 360 }))
      const result = pinch(palette(hexes))
      const failing = checkPalette(result.swatches).filter((c) => !c.passes)
      expect(failing, `palet ${hexes.join(' ')}`).toEqual([])
      expect(result.unreachable).toEqual([])
    }
  })

  it('verschuift alleen de lichtheid, en laat tint en chroma zoveel mogelijk staan', () => {
    const before = palette(['#f2e8dc', '#e8d8c4', '#a38f7c', '#d98f5a', '#7fb0d0'])
    const after = pinch(before)
    expect(after.changed.length).toBeGreaterThan(0)
    const moved = after.changed.map((i) => [fromHex(before[i].hex), fromHex(after.swatches[i].hex)] as const)
    for (const [a, b] of moved) expect(Math.abs(a.l - b.l)).toBeGreaterThan(0.01)
    // Bij kleuren met genoeg chroma om een tint te hebben, blijft die tint staan
    const hueShifts = moved.filter(([a, b]) => a.c > 0.05 && b.c > 0.05).map(([a, b]) => Math.abs(((a.h - b.h + 540) % 360) - 180))
    expect(Math.max(0, ...hueShifts)).toBeLessThan(6)
  })

  it('verschuift zo weinig mogelijk: tekst die net te licht is wordt net donker genoeg', () => {
    const after = pinch(palette(['#ffffff', '#777777', '#000000']))
    // Grijs #777777 haalt 4,48:1 op wit. Het snuifje mag er maar een tikje aan veranderen
    const text = after.swatches[1].hex
    expect(text).not.toBe('#777777')
    expect(Math.abs(fromHex(text).l - fromHex('#777777').l)).toBeLessThan(0.02)
  })

  it('laat een kleur onder een kurk staan', () => {
    const before = palette(['#f7f4eb', '#cccccc', '#bbbbbb'])
    const after = pinch(before, [false, true, false])
    expect(after.swatches[1].hex).toBe('#cccccc')
    expect(checkPalette(after.swatches).every((c) => c.passes)).toBe(true)
  })

  it('zegt het eerlijk als beide kleuren vastzitten', () => {
    const before = palette(['#f7f4eb', '#eeeeee', '#bbbbbb'])
    const after = pinch(before, [true, true, false])
    expect(after.unreachable.map((c) => c.fgRole)).toEqual(['tekst'])
  })
})
