import { describe, expect, it } from 'vitest'
import type { Bottle } from './bottle.ts'
import { cssOklch, tokenName, toCss, toJson, toTailwind } from './exports.ts'

const bottle: Bottle = {
  swatches: [
    { hex: '#f7f4eb', role: 'achtergrond' },
    { hex: '#ebe4d0', role: 'oppervlak' },
    { hex: '#2c2823', role: 'tekst' },
    { hex: '#8f4526', role: 'accent' },
    { hex: '#c25a3a', role: 'signaal' },
    { hex: '#3b533e', role: 'accent' },
  ],
  recipe: { items: [{ id: 'mos' }, { id: 'roest' }], stirs: 4, size: 6, seed: 12 },
  name: 'Roest */ met mos',
  date: '2026-11-23',
}

describe('exports', () => {
  it('nummert een tweede accent', () => {
    expect(bottle.swatches.map((_, i) => tokenName(bottle.swatches, i))).toEqual(['achtergrond', 'oppervlak', 'tekst', 'accent', 'signaal', 'accent-2'])
  })

  it('schrijft CSS custom properties', () => {
    const css = toCss(bottle)
    expect(css).toContain(':root {')
    expect(css).toContain('--kleur-tekst: #2c2823;')
    expect(css).toContain('--kleur-accent-2: #3b533e;')
    // Een naam kan een commentaar niet openbreken
    expect(css.split('*/')).toHaveLength(2)
  })

  it('schrijft een Tailwind v4 @theme-blok', () => {
    const theme = toTailwind(bottle)
    expect(theme).toMatch(/^\/\*.*\*\/\n@theme \{\n/)
    expect(theme).toContain('--color-achtergrond: #f7f4eb;')
    expect(theme).toContain('--color-signaal: #c25a3a;')
  })

  it('schrijft JSON met hex en oklch', () => {
    const data = JSON.parse(toJson(bottle))
    expect(data.naam).toBe('Roest */ met mos')
    expect(data.kleuren[2]).toEqual({ rol: 'tekst', token: 'tekst', hex: '#2c2823', oklch: cssOklch('#2c2823') })
    expect(data.recept.ingredienten).toEqual(['mos', 'roest'])
  })

  it('schrijft oklch zoals CSS het leest', () => {
    expect(cssOklch('#ffffff')).toBe('oklch(100% 0 0)')
    expect(cssOklch('#b8623b')).toMatch(/^oklch\(\d+(\.\d)?% 0\.\d+ \d+(\.\d)?\)$/)
  })
})
