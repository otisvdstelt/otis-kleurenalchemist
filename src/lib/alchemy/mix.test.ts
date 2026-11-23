import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fromHex } from './color'
import { checkPalette } from './contrast'
import { parseIngredients, type Ingredient } from './ingredients'
import { boilState, brew, homogeneity, overflowStrength, seedOf } from './mix'
import { rolesFor } from './palette'

const shelf = parseIngredients(JSON.parse(readFileSync(new URL('../../../public/data/ingredients.json', import.meta.url), 'utf8')))
const get = (id: string) => {
  const found = shelf.find((i) => i.id === id)
  if (!found) throw new Error(id)
  return found
}
const take = (...ids: string[]) => ids.map(get)

/** Een potje met één kleur erin, voor proefjes */
const pure = (id: string, hex: string): Ingredient => {
  const color = fromHex(hex)
  return { id, name: id, label: id, pigments: [{ color, weight: 1 }, { color, weight: 1 }], jar: { shape: 'bol', height: 1, cork: '#888888' } }
}

const COLOURS = shelf.filter((i) => !i.effect)

describe('deterministisch', () => {
  it('hetzelfde recept geeft precies hetzelfde palet', () => {
    const input = { ingredients: take('mos', 'zonsondergang'), stirs: 7, size: 5 }
    expect(brew(input)).toEqual(brew(input))
  })

  it('de volgorde van de potjes maakt niet uit', () => {
    const a = brew({ ingredients: take('mos', 'neon', 'klei'), stirs: 4, size: 5 })
    const b = brew({ ingredients: take('klei', 'mos', 'neon'), stirs: 4, size: 5 })
    expect(a?.swatches).toEqual(b?.swatches)
  })

  it('een slag meer geeft een ander palet', () => {
    const a = brew({ ingredients: take('mos', 'neon'), stirs: 4, size: 5 })
    const b = brew({ ingredients: take('mos', 'neon'), stirs: 5, size: 5 })
    expect(a?.seed).not.toBe(b?.seed)
    expect(a?.swatches).not.toEqual(b?.swatches)
  })

  it('de seed hangt af van recept, slagen en grootte', () => {
    expect(seedOf(take('mos'), 1, 5)).not.toBe(seedOf(take('mos'), 1, 6))
    expect(seedOf(take('mos', 'inkt'), 1, 5)).toBe(seedOf(take('inkt', 'mos'), 1, 5))
  })
})

describe('mengen', () => {
  it('een lege ketel geeft niks', () => {
    expect(brew({ ingredients: [], stirs: 3, size: 5 })).toBeNull()
    expect(brew({ ingredients: take('water', 'contrast'), stirs: 3, size: 5 })).toBeNull()
  })

  it('blauw met geel geeft groen en geen grijs', () => {
    const result = brew({ ingredients: [pure('blauw', '#2a5bd7'), pure('geel', '#f2d22e')], stirs: 40, size: 5 })
    const blend = fromHex(result!.blend)
    expect(blend.h).toBeGreaterThan(110)
    expect(blend.h).toBeLessThan(170)
    expect(blend.c).toBeGreaterThan(0.08)
  })

  it('roeren maakt het geheel eenvormiger', () => {
    const spreadOf = (stirs: number) => {
      const swatches = brew({ ingredients: take('neon', 'diepzee'), stirs, size: 7 })!.swatches.filter((s) => s.role === 'accent' || s.role === 'signaal')
      const hues = swatches.map((s) => fromHex(s.hex).h)
      return Math.max(...hues) - Math.min(...hues)
    }
    expect(homogeneity(0)).toBe(0)
    expect(homogeneity(100)).toBeGreaterThan(0.99)
    expect(spreadOf(60)).toBeLessThan(spreadOf(0))
  })

  it('geeft de rollen in vaste volgorde, voor elke grootte', () => {
    for (let size = 3; size <= 7; size++) {
      const result = brew({ ingredients: take('herfst'), stirs: 2, size })!
      expect(result.swatches.map((s) => s.role)).toEqual(rolesFor(size))
    }
    expect(brew({ ingredients: take('herfst'), stirs: 2, size: 12 })!.swatches).toHaveLength(7)
  })

  it('heeft altijd een lichte en een donkere kleur, ook bij elke combinatie van twee', () => {
    for (const a of COLOURS) {
      for (const b of COLOURS) {
        for (const stirs of [0, 6, 30]) {
          const result = brew({ ingredients: [a, b], stirs, size: 5 })!
          const ls = result.swatches.map((s) => fromHex(s.hex).l)
          expect(Math.max(...ls), `${a.id}+${b.id}`).toBeGreaterThan(0.85)
          expect(Math.min(...ls), `${a.id}+${b.id}`).toBeLessThan(0.32)
          // Tekst en achtergrond liggen ver uit elkaar
          const bg = fromHex(result.swatches[0].hex).l
          const text = fromHex(result.swatches[2].hex).l
          expect(Math.abs(bg - text)).toBeGreaterThan(0.55)
        }
      }
    }
  })

  it('water maakt lichter en zachter, houtskool donkerder', () => {
    const mean = (ids: string[], key: 'l' | 'c') => {
      const swatches = brew({ ingredients: take(...ids), stirs: 5, size: 5 })!.swatches
      return swatches.reduce((sum, s) => sum + fromHex(s.hex)[key], 0) / swatches.length
    }
    expect(mean(['zonsondergang', 'water'], 'l')).toBeGreaterThan(mean(['zonsondergang'], 'l'))
    expect(mean(['zonsondergang', 'water'], 'c')).toBeLessThan(mean(['zonsondergang'], 'c'))
    expect(mean(['zonsondergang', 'houtskool'], 'l')).toBeLessThan(mean(['zonsondergang'], 'l'))
  })

  it('genoeg houtskool maakt er een donker palet van', () => {
    expect(brew({ ingredients: take('zeeschuim'), stirs: 3, size: 5 })!.dark).toBe(false)
    expect(brew({ ingredients: take('diepzee', 'houtskool', 'houtskool'), stirs: 3, size: 5 })!.dark).toBe(true)
  })

  it('een kurk houdt zijn kleur, de rest verandert', () => {
    const first = brew({ ingredients: take('mos', 'koper'), stirs: 3, size: 5 })!
    const corks = [null, null, null, first.swatches[3].hex, null]
    const again = brew({ ingredients: take('mos', 'koper'), stirs: 4, size: 5, corks })!
    expect(again.swatches[3].hex).toBe(first.swatches[3].hex)
    expect(again.corked).toEqual([false, false, false, true, false])
    expect(again.swatches.filter((s, i) => i !== 3 && s.hex !== first.swatches[i].hex).length).toBeGreaterThan(0)
  })
})

describe('modder', () => {
  it('telt alleen kleuren voor het overkoken', () => {
    expect(boilState(0)).toBe('leeg')
    expect(boilState(1)).toBe('rustig')
    expect(boilState(4)).toBe('rustig')
    expect(boilState(5)).toBe('onrustig')
    expect(boilState(6)).toBe('overkoken')
    expect(boilState(9)).toBe('overkoken')
    expect(overflowStrength(5)).toBe(0)
    expect(overflowStrength(6)).toBeGreaterThan(0)
    expect(overflowStrength(8)).toBe(1)
    const withSpecials = brew({ ingredients: take('mos', 'klei', 'neon', 'inkt', 'contrast', 'water', 'houtskool'), stirs: 3, size: 5 })!
    expect(withSpecials.boil).toBe('rustig')
  })

  it('vijf potjes borrelt onrustig maar is nog geen modder', () => {
    const result = brew({ ingredients: take('mos', 'klei', 'neon', 'citroen', 'lavendel'), stirs: 3, size: 5 })!
    expect(result.boil).toBe('onrustig')
  })

  it('zes of meer kookt over, en alles schuift naar modderbruin', () => {
    const calm = brew({ ingredients: take('neon', 'citroen', 'lavendel', 'zeeschuim', 'kersenbloesem'), stirs: 3, size: 5 })!
    const over = brew({ ingredients: take('neon', 'citroen', 'lavendel', 'zeeschuim', 'kersenbloesem', 'diepzee', 'koper', 'mos'), stirs: 3, size: 5 })!
    expect(over.boil).toBe('overkoken')
    expect(over.mud).toBe(true)
    const chroma = (swatches: { hex: string }[]) => swatches.reduce((sum, s) => sum + fromHex(s.hex).c, 0) / swatches.length
    expect(chroma(over.swatches)).toBeLessThan(chroma(calm.swatches))
    const blend = fromHex(over.blend)
    expect(blend.c).toBeLessThan(0.07)
    expect(blend.h).toBeGreaterThan(25)
    expect(blend.h).toBeLessThan(100)
  })

  it('twee felle complementaire kleuren, goed geroerd, geven vanzelf modder', () => {
    const result = brew({ ingredients: [pure('rood', '#d0302a'), pure('groen', '#20a050')], stirs: 40, size: 5 })!
    expect(result.boil).toBe('rustig')
    expect(result.mud).toBe(true)
  })

  it('modder kun je nog steeds bottelen: er komt gewoon een palet uit', () => {
    const over = brew({ ingredients: take('neon', 'citroen', 'lavendel', 'zeeschuim', 'kersenbloesem', 'diepzee'), stirs: 3, size: 5 })!
    expect(over.swatches).toHaveLength(5)
  })
})

describe('snuifje contrast in de ketel', () => {
  it('maakt elk paar leesbaar, bij elke combinatie', () => {
    for (const a of COLOURS) {
      for (const b of COLOURS) {
        const result = brew({ ingredients: [a, b, get('water'), get('water'), get('contrast')], stirs: 5, size: 5 })!
        expect(
          checkPalette(result.swatches).filter((c) => !c.passes),
          `${a.id}+${b.id}`,
        ).toEqual([])
        expect(result.pinch).not.toBeNull()
      }
    }
  })
})
