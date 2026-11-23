import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strings } from '../../content/strings'
import { bottle, ingredientsOf, type Bottle } from './bottle'
import { photoIngredient, parseIngredients } from './ingredients'
import { brew } from './mix'
import { decodeBottle, decodeShelf, encodeBottle, encodeShelf, fromBase64Url, readRoute, toBase64Url } from './share'

const shelf = parseIngredients(JSON.parse(readFileSync(new URL('../../../public/data/ingredients.json', import.meta.url), 'utf8')))
const take = (...ids: string[]) => ids.map((id) => shelf.find((i) => i.id === id)!)
const PHOTO = { name: strings.namen.photo, label: 'foto' }

function fill(ingredients = take('mos', 'koper', 'contrast'), stirs = 6, size = 5, name = 'Mos na regen'): Bottle {
  return bottle(brew({ ingredients, stirs, size })!, ingredients, stirs, size, name, '2026-11-23')
}

describe('base64url', () => {
  it('gaat heen en terug, ook met bytes die in gewone base64 + en / worden', () => {
    const bytes = Uint8Array.from([0, 1, 250, 251, 252, 253, 254, 255, 62, 63])
    const code = toBase64Url(bytes)
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(fromBase64Url(code)).toEqual(bytes)
  })
})

describe('flesje als link', () => {
  it('coderen en decoderen heffen elkaar op', () => {
    const original = fill()
    expect(decodeBottle(encodeBottle(original))).toEqual(original)
  })

  it('werkt voor elke grootte en met een lange naam met rare tekens', () => {
    for (let size = 3; size <= 7; size++) {
      const original = fill(take('nachtlucht', 'citroen'), 30, size, 'Één café, één crème brûlée — 🌙')
      expect(decodeBottle(encodeBottle(original))).toEqual(original)
    }
  })

  it('neemt de pigmenten van een foto mee, zodat je ermee verder kunt brouwen', () => {
    const photo = photoIngredient('foto-1a2b', [
      { color: { l: 0.62, c: 0.14, h: 30 }, weight: 4.2 },
      { color: { l: 0.85, c: 0.05, h: 90 }, weight: 2 },
    ], PHOTO)
    const ingredients = [photo, ...take('mos')]
    const original = fill(ingredients, 3, 5, 'Kiekje aan zee')
    const decoded = decodeBottle(encodeBottle(original))!
    expect(decoded).toEqual(original)
    // Hetzelfde recept uit de link geeft weer precies hetzelfde palet
    const again = brew({ ingredients: ingredientsOf(decoded.recipe, shelf, PHOTO), stirs: decoded.recipe.stirs, size: decoded.recipe.size })!
    expect(again.swatches).toEqual(original.swatches)
    expect(again.seed).toBe(original.recipe.seed)
  })

  it('bewaart de uitkomst zelf, niet alleen het recept', () => {
    const original = fill()
    const tampered = { ...original, swatches: original.swatches.map((s, i) => (i === 3 ? { ...s, hex: '#123456' } : s)) }
    expect(decodeBottle(encodeBottle(tampered))!.swatches[3].hex).toBe('#123456')
  })

  it('is kort genoeg voor een chat', () => {
    expect(encodeBottle(fill()).length).toBeLessThan(120)
  })

  it('weigert rommel zonder te struikelen', () => {
    expect(decodeBottle('')).toBeNull()
    expect(decodeBottle('!!!')).toBeNull()
    expect(decodeBottle('AQ')).toBeNull()
    expect(decodeBottle(toBase64Url(Uint8Array.from([9, 1, 2, 3])))).toBeNull()
    const good = encodeBottle(fill())
    expect(decodeBottle(good.slice(0, good.length - 6))).toBeNull()
  })

  it('leest versie 1 nog, zoals hij op 23 november 2026 gedeeld werd', () => {
    // Deze code is bevroren. Verandert het formaat, dan moet deze test blijven slagen
    const v1 = 'AQXv9NoAtuPIAQwmAAKmZi4DTXgaBAxNb3MgbmEgcmVnZW7WEwYF0yKz5AMAA21vcwAFa29wZXIACGNvbnRyYXN0'
    const decoded = decodeBottle(v1)
    expect(decoded).not.toBeNull()
    expect(decoded!.name).toBe('Mos na regen')
    expect(decoded!.date).toBe('2026-11-23')
    expect(decoded!.swatches).toEqual([
      { hex: '#eff4da', role: 'achtergrond' },
      { hex: '#b6e3c8', role: 'oppervlak' },
      { hex: '#0c2600', role: 'tekst' },
      { hex: '#a6662e', role: 'accent' },
      { hex: '#4d781a', role: 'signaal' },
    ])
    expect(decoded!.recipe).toEqual({ items: [{ id: 'mos' }, { id: 'koper' }, { id: 'contrast' }], stirs: 6, size: 5, seed: 3836945107 })
  })
})

describe('plank als link', () => {
  it('coderen en decoderen heffen elkaar op', () => {
    const bottles = [fill(), fill(take('neon'), 2, 3, 'Neon om drie uur'), fill(take('as', 'water'), 12, 7, 'As na regen')]
    expect(decodeShelf(encodeShelf(bottles))).toEqual(bottles)
    expect(decodeShelf(encodeShelf([]))).toEqual([])
  })

  it('weigert rommel', () => {
    expect(decodeShelf('zzzz')).toBeNull()
    expect(decodeShelf(encodeBottle(fill()))).toBeNull()
  })
})

describe('readRoute', () => {
  it('leest het pad en de hash', () => {
    expect(readRoute('/fles/AQXz8')).toEqual({ kind: 'fles', code: 'AQXz8' })
    expect(readRoute('/plank/AQ-_x/')).toEqual({ kind: 'plank', code: 'AQ-_x' })
    expect(readRoute('/', '#/fles/abc')).toEqual({ kind: 'fles', code: 'abc' })
    expect(readRoute('/', '#plank/abc')).toEqual({ kind: 'plank', code: 'abc' })
    expect(readRoute('/')).toEqual({ kind: 'werkplaats' })
    expect(readRoute('/fles/')).toEqual({ kind: 'werkplaats' })
    expect(readRoute('/fles/a b')).toEqual({ kind: 'werkplaats' })
  })
})
