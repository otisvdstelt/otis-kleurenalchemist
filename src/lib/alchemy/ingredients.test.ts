import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fromHex } from './color.ts'
import { BadIngredients, isSpecial, jarLayers, parseIngredients } from './ingredients.ts'

const shipped = JSON.parse(readFileSync(new URL('../../../public/data/ingredients.json', import.meta.url), 'utf8')) as unknown

describe('ingredients.json', () => {
  const list = parseIngredients(shipped)

  it('heeft zestien kleuren en drie speciale', () => {
    expect(list.filter((i) => !isSpecial(i))).toHaveLength(16)
    expect(list.filter(isSpecial).map((i) => i.effect)).toEqual(['contrast', 'water', 'houtskool'])
  })

  it('heeft alles wat de opdracht vraagt', () => {
    const ids = list.map((i) => i.id)
    for (const id of ['zonsondergang', 'mos', 'oud-papier', 'neon', 'diepzee', 'herfst', 'roest', 'lavendel', 'as', 'citroen', 'nachtlucht', 'klei', 'zeeschuim', 'kersenbloesem', 'inkt', 'koper']) {
      expect(ids).toContain(id)
    }
  })
})

describe('parseIngredients', () => {
  const good = { id: 'mos', naam: 'mos', etiket: 'groen', pigmenten: [{ oklch: [0.5, 0.1, 130], gewicht: 1 }, { oklch: [0.4, 0.1, 130], gewicht: 1 }], potje: { vorm: 'bol', hoogte: 1, kurk: '#aa8866' } }

  it('weigert rommel hardop', () => {
    expect(() => parseIngredients({})).toThrow(BadIngredients)
    expect(() => parseIngredients([good, good])).toThrow(/dubbele/)
    expect(() => parseIngredients([{ ...good, pigmenten: [good.pigmenten[0]] }])).toThrow(/2 tot 4/)
    expect(() => parseIngredients([{ ...good, pigmenten: [{ oklch: [2, 0, 0], gewicht: 1 }, good.pigmenten[0]] }])).toThrow(/bereik/)
    expect(() => parseIngredients([{ ...good, potje: { ...good.potje, kurk: 'bruin' } }])).toThrow(/kurk/)
  })

  it('leest een goed ingrediënt', () => {
    const [mos] = parseIngredients([good])
    expect(mos.pigments[0]).toEqual({ color: { l: 0.5, c: 0.1, h: 130 }, weight: 1 })
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
