import { describe, expect, it } from 'vitest'
import { apca, checkPalette, contrastRatio, formatRatio, labelFor, luminance } from './contrast.ts'

describe('WCAG 2.2', () => {
  it('zwart op wit is 21:1', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 6)
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 6)
  })

  it('een kleur op zichzelf is 1:1', () => {
    expect(contrastRatio('#3b533e', '#3b533e')).toBe(1)
  })

  it('kent de bekende voorbeelden', () => {
    // #767676 op wit is het lichtste grijs dat AA haalt
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2)
    expect(contrastRatio('#777777', '#ffffff')).toBeLessThan(4.5)
    // #595959 op wit haalt AAA
    expect(contrastRatio('#595959', '#ffffff')).toBeCloseTo(7, 1)
    // Puur rood, groen en blauw op wit
    expect(contrastRatio('#ff0000', '#ffffff')).toBeCloseTo(4, 2)
    expect(contrastRatio('#0000ff', '#ffffff')).toBeCloseTo(8.59, 2)
    expect(contrastRatio('#00ff00', '#ffffff')).toBeCloseTo(1.37, 2)
  })

  it('luminantie van wit, zwart en middengrijs', () => {
    expect(luminance('#ffffff')).toBeCloseTo(1, 6)
    expect(luminance('#000000')).toBe(0)
    expect(luminance('#808080')).toBeCloseTo(0.2159, 4)
  })

  it('schrijft een verhouding naar beneden afgerond, met een komma', () => {
    expect(formatRatio(4.4999)).toBe('4,4:1')
    expect(formatRatio(21)).toBe('21,0:1')
  })
})

describe('knoptekst', () => {
  const palette = (accent: string) => [
    { hex: '#fcfaf3', role: 'achtergrond' as const },
    { hex: '#2c2823', role: 'tekst' as const },
    { hex: accent, role: 'accent' as const },
  ]

  it('kiest de tekstkleur die het best leest op de knop', () => {
    expect(labelFor(palette('#1d3b7a'), 2)).toBe(0)
    expect(labelFor(palette('#f2d22e'), 2)).toBe(1)
  })

  it('meet de knoptekst met de drempel voor gewone tekst', () => {
    const knop = checkPalette(palette('#8a8a8a')).find((c) => c.kind === 'knop')!
    expect(knop.required).toBe(4.5)
    expect(knop.passes).toBe(false)
  })
})

describe('niveaus voor een onderdeel', () => {
  const level = (fg: string) => checkPalette([
    { hex: '#ffffff', role: 'achtergrond' },
    { hex: '#000000', role: 'tekst' },
    { hex: fg, role: 'accent' },
  ])[1]

  it('geeft een onderdeel AAA pas vanaf 7:1, en AA vanaf 3:1', () => {
    // #767676 haalt 4,54:1: genoeg voor tekst, maar voor een onderdeel nog geen AAA
    expect(level('#767676').level).toBe('aa')
    expect(level('#595959').level).toBe('aaa')
    expect(level('#949494').level).toBe('aa')
    expect(level('#aaaaaa').level).toBe('nee')
  })
})

describe('APCA', () => {
  it('kent de referentiewaarden', () => {
    expect(apca('#000000', '#ffffff')).toBeCloseTo(106.04, 1)
    expect(apca('#ffffff', '#000000')).toBeCloseTo(-107.88, 1)
    expect(apca('#888888', '#ffffff')).toBeCloseTo(63.06, 1)
    expect(apca('#ffffff', '#888888')).toBeCloseTo(-68.54, 1)
  })

  it('is nul voor dezelfde kleur', () => {
    expect(apca('#3b533e', '#3b533e')).toBe(0)
  })
})

describe('checkPalette', () => {
  it('meet de paren die ertoe doen', () => {
    const checks = checkPalette([
      { hex: '#f7f4eb', role: 'achtergrond' },
      { hex: '#ebe4d0', role: 'oppervlak' },
      { hex: '#2c2823', role: 'tekst' },
      { hex: '#b8623b', role: 'accent' },
      { hex: '#f0e68c', role: 'signaal' },
    ])
    expect(checks.map((c) => `${c.fgRole}/${c.bgRole}`)).toEqual(['tekst/achtergrond', 'tekst/oppervlak', 'accent/achtergrond', 'signaal/achtergrond', 'achtergrond/accent', 'tekst/signaal'])
    // Op een donker accent komt lichte tekst, op een licht signaal donkere
    expect(checks[4].kind).toBe('knop')
    expect(checks[5].kind).toBe('knop')
    expect(checks[0].passes).toBe(true)
    expect(checks[0].level).toBe('aaa')
    expect(checks[3].passes).toBe(false)
    expect(checks[3].required).toBe(3)
  })
})
