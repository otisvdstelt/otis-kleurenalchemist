import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fromHex } from './color.ts'
import { BadIngredients, isSpecial, jarLayers, parseIngredients } from './ingredients.ts'

const shipped = JSON.parse(readFileSync(new URL('../../../public/data/ingredients.json', import.meta.url), 'utf8')) as unknown

describe('ingredients.json', () => {
  const list = parseIngredients(shipped)

  it('heeft vijf doelen, zestien smaken, vijf harmonieën en drie bewerkingen', () => {
    const count = (kind: string) => list.filter((i) => i.kind === kind).length
    expect([count('doel'), count('smaak'), count('harmonie'), count('bewerking')]).toEqual([5, 16, 5, 3])
    expect(list.filter(isSpecial).map((i) => i.effect)).toEqual(['contrast', 'water', 'houtskool'])
    // Elke smaak zegt in een paar woorden wat hij doet, en heeft een tint en een effect
    for (const t of list.filter((i) => i.kind === 'smaak')) {
      expect(t.tint).toBeTypeOf('number')
      expect(t.taste).toBeDefined()
      expect(t.label.split(' ').length).toBeLessThanOrEqual(6)
    }
  })

  it('heeft alles wat de opdracht vraagt', () => {
    const ids = list.map((i) => i.id)
    for (const id of ['zonsondergang', 'mos', 'oud-papier', 'neon', 'diepzee', 'herfst', 'roest', 'lavendel', 'as', 'citroen', 'nachtlucht', 'klei', 'zeeschuim', 'kersenbloesem', 'inkt', 'koper']) {
      expect(ids).toContain(id)
    }
  })
})

describe('parseIngredients', () => {
  const good = { id: 'mos', soort: 'smaak', tint: 135, smaak: { warmte: -0.2 }, naam: 'mos', etiket: 'groen', pigmenten: [{ oklch: [0.5, 0.1, 130], gewicht: 1 }, { oklch: [0.4, 0.1, 130], gewicht: 1 }], potje: { vorm: 'bol', hoogte: 1, kurk: '#aa8866' } }

  it('weigert rommel hardop', () => {
    expect(() => parseIngredients({})).toThrow(BadIngredients)
    expect(() => parseIngredients([good, good])).toThrow(/dubbele/)
    expect(() => parseIngredients([{ ...good, pigmenten: [good.pigmenten[0]] }])).toThrow(/2 tot 4/)
    expect(() => parseIngredients([{ ...good, soort: 'kruid' }])).toThrow(/soort/)
    expect(() => parseIngredients([{ ...good, soort: 'doel', id: 'raket' }])).toThrow(/doel/)
    expect(() => parseIngredients([{ ...good, pigmenten: [{ oklch: [2, 0, 0], gewicht: 1 }, good.pigmenten[0]] }])).toThrow(/bereik/)
    expect(() => parseIngredients([{ ...good, potje: { ...good.potje, kurk: 'bruin' } }])).toThrow(/kurk/)
  })

  it('leest een goed ingrediënt', () => {
    const [mos] = parseIngredients([good])
    expect(mos.pigments[0]).toEqual({ color: { l: 0.5, c: 0.1, h: 130 }, weight: 1 })
    expect(mos.taste).toEqual({ warmte: -0.2, licht: 0, chroma: 0, contrast: 0 })
    expect(mos.jar.shape).toBe('bol')
  })
})

describe('jarLayers', () => {
  it('zet het donkerste pigment onderop, en de aandelen tellen op tot één', () => {
    const [mos] = parseIngredients(shipped).filter((i) => i.id === 'mos')
    const layers = jarLayers(mos)
    expect(layers).toHaveLength(3)
    expect(layers.reduce((sum, l) => sum + l.share, 0)).toBeCloseTo(1, 9)
    const lightness = layers.map((l) => fromHex(l.hex).l)
    expect([...lightness].sort((a, b) => a - b)).toEqual(lightness)
  })
})

describe('recipes.json', () => {
  it('heeft tien recepten met bestaande doelen, smaken en harmonieën', async () => {
    const { parseRecipes } = await import('./recipes.ts')
    const raw = JSON.parse(readFileSync(new URL('../../../public/data/recipes.json', import.meta.url), 'utf8')) as unknown
    const ids = new Set(parseIngredients(shipped).map((i) => i.id))
    const recipes = parseRecipes(raw, ids)
    expect(recipes).toHaveLength(10)
    expect(recipes.map((r) => r.goal)).toContain('presentatie')
    expect(() => parseRecipes([{ id: 'x', naam: 'x', uitleg: 'x', doel: 'website', smaken: ['drakenbloed'] }], ids)).toThrow(/smaak/)
  })
})
