import { describe, expect, it } from 'vitest'
import type { Bottle } from './bottle.ts'
import { cssOklch, toAse, toDesignTokens, tokenName, toCss, toJson, toSvg, toTailwind } from './exports.ts'

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
    expect(data.kleuren[2]).toEqual({ rol: 'tekst', token: 'tekst', hex: '#2c2823', oklch: cssOklch('#2c2823'), reeks: null })
    expect(data.recept.ingredienten).toEqual(['mos', 'roest'])
  })

  it('schrijft oklch zoals CSS het leest', () => {
    expect(cssOklch('#ffffff')).toBe('oklch(100% 0 0)')
    expect(cssOklch('#b8623b')).toMatch(/^oklch\(\d+(\.\d)?% 0\.\d+ \d+(\.\d)?\)$/)
  })
})

describe('meer exportvormen', () => {
  it('schrijft een SVG met elke kleur, en zet een naam met < veilig', () => {
    const svg = toSvg({ ...bottle, name: 'Mos <en> modder' })
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
    for (const s of bottle.swatches) expect(svg).toContain(`fill="${s.hex}"`)
    expect(svg).toContain('Mos &lt;en&gt; modder')
    expect(svg).not.toContain('<en>')
  })

  it('schrijft design tokens die Figma kan inlezen', () => {
    const tokens = JSON.parse(toDesignTokens(bottle))
    expect(tokens.kleur.rol.tekst).toEqual({ $type: 'color', $value: '#2c2823', $description: 'tekst' })
    expect(Object.keys(tokens.kleur.rol)).toHaveLength(6)
  })

  it('schrijft een geldig .ase-bestand', () => {
    const ase = toAse(bottle)
    const view = new DataView(ase.buffer)
    expect(String.fromCharCode(...ase.slice(0, 4))).toBe('ASEF')
    expect(view.getUint16(4)).toBe(1)
    expect(view.getUint32(8)).toBe(bottle.swatches.length + 2)
    // Het eerste blok opent een groep
    expect(view.getUint16(12)).toBe(0xc001)
    // Loop alle blokken af: elk blok zegt hoe lang het is, en samen vullen ze het bestand precies
    let at = 12
    const types: number[] = []
    for (let i = 0; i < bottle.swatches.length + 2; i++) {
      types.push(view.getUint16(at))
      at += 6 + view.getUint32(at + 2)
    }
    expect(at).toBe(ase.length)
    expect(types).toEqual([0xc001, ...bottle.swatches.map(() => 0x0001), 0xc002])
    // De eerste kleur: naam "achtergrond", dan RGB en drie floats
    const first = 12 + 6 + view.getUint32(14)
    const nameLength = view.getUint16(first + 6)
    const model = first + 6 + 2 + nameLength * 2
    expect(String.fromCharCode(...ase.slice(model, model + 4))).toBe('RGB ')
    expect(view.getFloat32(model + 4)).toBeCloseTo(0xf7 / 255, 5)
  })
})

describe('met reeksen', () => {
  const steps = ['#fafafa', '#f0f0f0', '#e0e0e0', '#c8c8c8', '#a8a8a8', '#888888', '#6c6c6c', '#555555', '#404040', '#2c2c2c', '#1a1a1a']
  const withRamps: Bottle = {
    ...bottle,
    swatches: [
      { hex: '#fafafa', role: 'achtergrond' },
      { hex: '#2c2c2c', role: 'tekst' },
      { hex: '#3b533e', role: 'hoofd' },
    ],
    ramps: [{ name: 'neutraal', steps }],
    recipe: { ...bottle.recipe, goal: 'website' },
  }

  it('zet de reeksen in het Tailwind-thema, en de rollen als verwijzing', () => {
    const theme = toTailwind(withRamps)
    expect(theme).toContain('--color-neutraal-50: #fafafa;')
    expect(theme).toContain('--color-neutraal-950: #1a1a1a;')
    expect(theme).toContain('--color-achtergrond: var(--color-neutraal-50);')
    expect(theme).toContain('--color-tekst: var(--color-neutraal-900);')
    expect(theme).toContain('--color-hoofd: #3b533e;')
  })

  it('koppelt de rollen in Figma aan de reeks', () => {
    const tokens = JSON.parse(toDesignTokens(withRamps))
    expect(tokens.kleur.neutraal['500'].$value).toBe('#888888')
    expect(tokens.kleur.rol.tekst.$value).toBe('{kleur.neutraal.900}')
  })
})
