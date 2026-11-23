import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { deltaEOK, fromHex } from './color.ts'
import { checkPalette } from './contrast.ts'
import { parseIngredients, type Ingredient } from './ingredients.ts'
import { boilState, brew, homogeneity, overflowStrength, seedOf } from './mix.ts'
import { rolesFor } from './palette.ts'
import { nameBrew } from './names.ts'
import { strings } from '../../content/strings'

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

  it('roeren trekt geen nieuw palet: de seed blijft, alleen de homogeniteit verandert', () => {
    const a = brew({ ingredients: take('mos', 'neon'), stirs: 4, size: 5 })!
    const b = brew({ ingredients: take('mos', 'neon'), stirs: 5, size: 5 })!
    expect(b.seed).toBe(a.seed)
    expect(b.homogeneity).toBeGreaterThan(a.homogeneity)
    // Eén slag verschuift de kleuren hooguit een beetje
    for (let i = 0; i < a.swatches.length; i++) expect(deltaEOK(fromHex(a.swatches[i].hex), fromHex(b.swatches[i].hex))).toBeLessThan(0.12)
  })

  it('opnieuw roeren trekt wel een nieuw palet', () => {
    const a = brew({ ingredients: take('mos', 'neon'), stirs: 4, size: 5 })!
    const b = brew({ ingredients: take('mos', 'neon'), stirs: 4, size: 5, reroll: 1 })!
    expect(b.seed).not.toBe(a.seed)
    expect(b.swatches).not.toEqual(a.swatches)
  })

  it('een vaste seed gaat voor alles', () => {
    expect(brew({ ingredients: take('mos'), stirs: 1, size: 5, reroll: 3, seed: 42 })!.seed).toBe(42)
  })

  it('de seed hangt af van de kleuren, de grootte en opnieuw roeren, niet van slagen of bijzondere potjes', () => {
    expect(seedOf(take('mos'), 5)).not.toBe(seedOf(take('mos'), 6))
    expect(seedOf(take('mos'), 5)).not.toBe(seedOf(take('mos'), 5, 1))
    expect(seedOf(take('mos', 'inkt'), 5)).toBe(seedOf(take('inkt', 'mos'), 5))
    expect(seedOf(take('mos', 'contrast', 'water', 'houtskool'), 5)).toBe(seedOf(take('mos'), 5))
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
    const again = brew({ ingredients: take('mos', 'koper'), stirs: 3, size: 5, corks, reroll: 1 })!
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
    expect(over.overflow).toBe(1)
    expect(calm.overflow).toBe(0)
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

describe('bijzondere potjes werken op het palet dat er al is', () => {
  it('het snuifje laat het palet staan dat al leesbaar was, en verandert de naam niet', () => {
    for (const ids of [['mos'], ['mos', 'koper'], ['zonsondergang', 'diepzee'], ['neon', 'lavendel']]) {
      const plain = brew({ ingredients: take(...ids), stirs: 5, size: 5 })!
      const pinched = brew({ ingredients: take(...ids, 'contrast'), stirs: 5, size: 5 })!
      expect(pinched.seed).toBe(plain.seed)
      expect(pinched.base).toEqual(plain.swatches)
      expect(pinched.pinch!.before).toEqual(plain.swatches)
      // Alleen wat niet leesbaar was, schuift
      const failing = new Set(checkPalette(plain.swatches).filter((c) => !c.passes).flatMap((c) => [c.fg, c.bg]))
      const untouched = pinched.swatches.filter((_, i) => !failing.has(i)).map((s) => s.hex)
      expect(untouched).toEqual(plain.swatches.filter((_, i) => !failing.has(i)).map((s) => s.hex))
      expect(nameBrew(pinched, take(...ids, 'contrast'), strings.namen)).toBe(nameBrew(plain, take(...ids), strings.namen))
    }
  })

  it('water en houtskool houden de trekking, en schuiven alleen de lichtheid en chroma', () => {
    const plain = brew({ ingredients: take('herfst'), stirs: 5, size: 5 })!
    const watered = brew({ ingredients: take('herfst', 'water'), stirs: 5, size: 5 })!
    expect(watered.seed).toBe(plain.seed)
    expect(watered.base).toEqual(plain.swatches)
    const pairs = watered.swatches.map((s, i) => [fromHex(plain.swatches[i].hex), fromHex(s.hex)] as const)
    for (const [before, after] of pairs) expect(after.l).toBeGreaterThanOrEqual(before.l - 0.005)
    const hueShifts = pairs.filter(([before]) => before.c > 0.06).map(([before, after]) => Math.abs(((after.h - before.h + 540) % 360) - 180))
    expect(Math.max(0, ...hueShifts)).toBeLessThan(8)
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
