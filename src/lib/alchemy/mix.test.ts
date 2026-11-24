import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strings } from '../../content/strings'
import { smallestGap } from './chart.ts'
import { deltaEOK, fromHex, hexToOklab } from './color.ts'
import { checkPalette, contrastRatio } from './contrast.ts'
import { CONFUSABLE } from './cvd.ts'
import { recipeSentence } from './describe.ts'
import { GOALS } from './goals.ts'
import { GOAL_IDS, parseIngredients, type GoalId } from './ingredients.ts'
import { boilState, brew, homogeneity, overflowStrength, seedOf } from './mix.ts'
import { nameBrew } from './names.ts'
import { STEPS } from './palette.ts'
import { combineTastes } from './taste.ts'

const shelf = parseIngredients(JSON.parse(readFileSync(new URL('../../../public/data/ingredients.json', import.meta.url), 'utf8')))
const get = (id: string) => {
  const found = shelf.find((i) => i.id === id)
  if (!found) throw new Error(id)
  return found
}
const take = (...ids: string[]) => ids.map(get)
const TASTES = shelf.filter((i) => i.kind === 'smaak')
const hueGap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180)
const role = (b: { swatches: { role: string; hex: string }[] }, r: string) => b.swatches.find((s) => s.role === r)!.hex

describe('deterministisch', () => {
  it('hetzelfde recept geeft precies hetzelfde palet, en harmonie en bewerkingen mogen in elke volgorde', () => {
    const a = brew({ ingredients: take('mos', 'zonsondergang', 'analoog', 'water'), goal: 'website', stirs: 7 })
    const b = brew({ ingredients: take('water', 'mos', 'analoog', 'zonsondergang'), goal: 'website', stirs: 7 })
    expect(a).toEqual(b)
  })

  it('bij gelijke stand wordt het eerste potje de hoofdkleur', () => {
    const a = brew({ ingredients: take('mos', 'zonsondergang'), goal: 'website', stirs: 30 })!
    const b = brew({ ingredients: take('zonsondergang', 'mos'), goal: 'website', stirs: 30 })!
    expect(hueGap(fromHex(role(a, 'hoofd')).h, 135)).toBeLessThan(30)
    expect(hueGap(fromHex(role(b, 'hoofd')).h, 45)).toBeLessThan(30)
  })

  it('roeren trekt geen nieuw palet: één slag erbij verschuift elke kleur minder dan 0,05', () => {
    for (const goal of GOAL_IDS) {
      for (const stirs of [0, 3, 10]) {
        const a = brew({ ingredients: take('neon', 'diepzee'), goal, stirs })!
        const b = brew({ ingredients: take('neon', 'diepzee'), goal, stirs: stirs + 1 })!
        expect(b.seed).toBe(a.seed)
        for (let i = 0; i < a.swatches.length; i++) expect(deltaEOK(hexToOklab(a.swatches[i].hex), hexToOklab(b.swatches[i].hex)), `${goal} ${stirs} ${a.swatches[i].role}`).toBeLessThan(0.05)
      }
    }
  })

  it('opnieuw roeren trekt wel een nieuw palet', () => {
    const a = brew({ ingredients: take('mos', 'neon'), stirs: 2 })!
    const b = brew({ ingredients: take('mos', 'neon'), stirs: 2, reroll: 1 })!
    expect(b.seed).not.toBe(a.seed)
    expect(b.swatches).not.toEqual(a.swatches)
  })

  it('de seed hangt af van doel, basis, smaken en opnieuw roeren, niet van slagen of bewerkingen', () => {
    expect(seedOf(take('mos'), 'website')).not.toBe(seedOf(take('mos'), 'affiche'))
    expect(seedOf(take('mos'), 'website', ['#3b533e'])).not.toBe(seedOf(take('mos'), 'website'))
    expect(seedOf(take('mos'), 'website', [], 1)).not.toBe(seedOf(take('mos'), 'website'))
    expect(seedOf(take('mos', 'contrast', 'water'), 'website')).toBe(seedOf(take('mos'), 'website'))
  })

  it('zonder basis en zonder smaak is er niks te brouwen', () => {
    expect(brew({ ingredients: [], stirs: 3 })).toBeNull()
    expect(brew({ ingredients: take('analoog', 'contrast'), stirs: 3 })).toBeNull()
    expect(brew({ ingredients: [], bases: ['#3b533e'], stirs: 0 })).not.toBeNull()
  })
})

describe('basis', () => {
  it('een vergrendelde basis komt exact terug, als hoofdkleur en in de reeks', () => {
    for (const goal of GOAL_IDS) {
      const result = brew({ ingredients: take('zeeschuim', 'neon', 'contrast', 'water'), goal, bases: ['#3b533e'], stirs: 4 })!
      expect(role(result, 'hoofd'), goal).toBe('#3b533e')
      const hoofd = result.ramps.filter((r) => r.name === 'hoofd')
      expect(hoofd.every((r) => r.steps.includes('#3b533e')), goal).toBe(true)
    }
  })

  it('een tweede basis wordt het accent, ook exact', () => {
    const result = brew({ ingredients: [], goal: 'website', bases: ['#3b533e', '#b8623b'], stirs: 4 })!
    expect(role(result, 'accent')).toBe('#b8623b')
  })
})

describe('doelen', () => {
  it('elk doel geeft zijn eigen rollen en reeksen', () => {
    for (const goal of GOAL_IDS) {
      const result = brew({ ingredients: take('mos'), goal, stirs: 5 })!
      const roles = new Set(result.swatches.map((s) => s.role))
      for (const r of GOALS[goal].roles) expect(roles.has(r), `${goal} ${r}`).toBe(true)
      expect(result.ramps.map((r) => r.name)).toEqual(GOALS[goal].ramps)
      for (const r of result.ramps) expect(r.steps).toHaveLength(STEPS.length)
    }
  })

  it('een website heeft goed, let op en fout in hun eigen tint', () => {
    const result = brew({ ingredients: take('lavendel'), goal: 'website', stirs: 8 })!
    expect(hueGap(fromHex(role(result, 'goed')).h, 145)).toBeLessThan(20)
    expect(hueGap(fromHex(role(result, 'let-op')).h, 75)).toBeLessThan(20)
    expect(hueGap(fromHex(role(result, 'fout')).h, 25)).toBeLessThan(20)
  })

  it('de reeksen lopen van licht naar donker, met de meeste chroma in het midden', () => {
    const result = brew({ ingredients: take('zonsondergang'), goal: 'website', stirs: 8 })!
    const hoofd = result.ramps.find((r) => r.name === 'hoofd')!.steps.map(fromHex)
    for (let i = 1; i < hoofd.length; i++) expect(hoofd[i].l).toBeLessThan(hoofd[i - 1].l)
    expect(hoofd[5].c).toBeGreaterThan(hoofd[0].c)
    expect(hoofd[5].c).toBeGreaterThan(hoofd[10].c)
  })

  it('app in het donker: donkere achtergrond, lichte tekst', () => {
    const result = brew({ ingredients: take('diepzee'), goal: 'donker', stirs: 8 })!
    expect(fromHex(role(result, 'achtergrond')).l).toBeLessThan(0.3)
    expect(fromHex(role(result, 'tekst')).l).toBeGreaterThan(0.85)
    expect(result.dark).toBe(true)
  })

  it('een affiche heeft vier kleuren met veel contrast', () => {
    const result = brew({ ingredients: take('zonsondergang', 'citroen', 'drieklank'), goal: 'affiche', stirs: 4 })!
    expect(result.swatches).toHaveLength(4)
    expect(contrastRatio(role(result, 'tekst'), role(result, 'achtergrond'))).toBeGreaterThan(10)
    expect(fromHex(role(result, 'hoofd')).c).toBeGreaterThan(0.12)
  })

  it('een presentatie heeft zes grafiekkleuren die je ook bij deuteranopie uit elkaar houdt', () => {
    for (const ids of [['zeeschuim', 'as', 'een-tint'], ['mos'], ['neon', 'zonsondergang']]) {
      const result = brew({ ingredients: take(...ids), goal: 'presentatie', stirs: 12 })!
      const chart = result.swatches.filter((s) => s.role === 'grafiek').map((s) => s.hex)
      expect(chart).toHaveLength(6)
      expect(smallestGap(chart, 'deuteranopie'), ids.join('+')).toBeGreaterThanOrEqual(CONFUSABLE)
    }
  })
})

describe('smaken en harmonie', () => {
  it('zeeschuim maakt koeler en lichter, herfst warmer', () => {
    // Met dezelfde seed, zodat alleen de smaak verschilt
    const plain = brew({ ingredients: [], goal: 'website', bases: ['#b8623b'], stirs: 30, seed: 7 })!
    const cool = brew({ ingredients: take('zeeschuim'), goal: 'website', bases: ['#b8623b'], stirs: 30, seed: 7 })!
    const accentPlain = fromHex(role(plain, 'accent'))
    const accentCool = fromHex(role(cool, 'accent'))
    expect(hueGap(accentCool.h, 245)).toBeLessThan(hueGap(accentPlain.h, 245))
    expect(accentCool.l).toBeGreaterThan(accentPlain.l)
    const taste = combineTastes(take('herfst'))
    expect(taste.warmte).toBeGreaterThan(0)
  })

  it('smaken tellen op: twee keer neon is feller dan één keer', () => {
    expect(combineTastes(take('neon', 'neon')).chroma).toBeGreaterThan(combineTastes(take('neon')).chroma)
  })

  it('mos, diepzee en zonsondergang: de zonsondergang verdwijnt niet, er zit een warme kleur in', () => {
    const result = brew({ ingredients: take('mos', 'diepzee', 'zonsondergang'), goal: 'website', stirs: 6 })!
    const warm = result.swatches.filter((s) => s.role === 'hoofd' || s.role === 'accent').map((s) => fromHex(s.hex)).some((c) => c.c > 0.06 && (c.h < 90 || c.h > 340))
    expect(warm).toBe(true)
  })

  it('complementair zet het accent tegenover de hoofdkleur', () => {
    const result = brew({ ingredients: take('complementair'), goal: 'website', bases: ['#3b533e'], stirs: 40 })!
    expect(hueGap(fromHex(role(result, 'accent')).h, fromHex('#3b533e').h)).toBeGreaterThan(140)
  })
})

describe('contrast per doel', () => {
  it('met een snuifje halen alle paren hun drempel, en blijft de tint staan', () => {
    for (const goal of GOAL_IDS) {
      for (const t of TASTES) {
        const result = brew({ ingredients: [t, get('contrast')], goal, stirs: 5 })!
        expect(checkPalette(result.swatches).filter((c) => !c.passes), `${goal} ${t.id}`).toEqual([])
        const shifts = result.pinch!.changed.map((i) => [fromHex(result.pinch!.before[i].hex), fromHex(result.swatches[i].hex)] as const).filter(([a, b]) => a.c > 0.06 && b.c > 0.06)
        expect(Math.max(0, ...shifts.map(([a, b]) => hueGap(a.h, b.h))), `${goal} ${t.id}`).toBeLessThan(8)
      }
    }
  })

  it('zonder snuifje halen alle tekst en alle knoptekst al AA, voor elke smaak, elk doel en elke basis', () => {
    for (const goal of GOAL_IDS) {
      for (const t of TASTES) {
        for (const bases of [[], ['#3b533e'], ['#f2d22e'], ['#1d3b7a', '#e85f6b']]) {
          const result = brew({ ingredients: [t], goal, bases, stirs: 5 })!
          const weak = checkPalette(result.swatches).filter((c) => c.kind !== 'onderdeel' && !c.passes)
          expect(weak, `${goal} ${t.id} ${bases.join(',')}`).toEqual([])
        }
      }
    }
  })
})

describe('overkoken', () => {
  it('vier smaken borrelt onrustig, vijf kookt over, twee harmonieën ook', () => {
    expect(boilState(3)).toBe('rustig')
    expect(boilState(4)).toBe('onrustig')
    expect(boilState(5)).toBe('overkoken')
    expect(boilState(1, 2)).toBe('overkoken')
    expect(overflowStrength(5)).toBeGreaterThanOrEqual(0.7)
    expect(overflowStrength(7)).toBe(1)
  })

  it('overgekookt wordt het palet modder, maar je kunt het bottelen', () => {
    const result = brew({ ingredients: take('neon', 'citroen', 'lavendel', 'zeeschuim', 'kersenbloesem'), goal: 'website', stirs: 3 })!
    expect(result.mud).toBe(true)
    const middles = result.swatches.filter((s) => s.role === 'hoofd' || s.role === 'accent').map((s) => fromHex(s.hex))
    for (const c of middles) {
      expect(c.c).toBeLessThan(0.08)
      expect(hueGap(c.h, 60)).toBeLessThan(45)
    }
    expect(brew({ ingredients: take('mos', 'analoog', 'complementair'), stirs: 3 })!.mud).toBe(true)
  })
})

describe('woorden', () => {
  it('het recept in één zin', () => {
    const sentence = recipeSentence({ bases: ['#3b533e'], tasteNames: ['zeeschuim'], goal: 'website', taste: combineTastes(take('zeeschuim')), harmony: 'analoog' }, strings.zin)
    expect(sentence).toBe('Jouw groen, voor een website, fris, koel en zacht, analoog')
  })

  it('een snuifje verandert de naam niet, en een basis zonder smaak heet naar zijn kleur', () => {
    const plain = brew({ ingredients: take('mos'), stirs: 5 })!
    const pinched = brew({ ingredients: take('mos', 'contrast'), stirs: 5 })!
    expect(nameBrew(pinched, take('mos', 'contrast'), strings.namen)).toBe(nameBrew(plain, take('mos'), strings.namen))
    const only = brew({ ingredients: [], bases: ['#3b533e'], stirs: 5 })!
    expect(nameBrew(only, [], strings.namen, ['#3b533e'])).toMatch(/^Groen /)
  })

  it('homogeniteit loopt van 0 naar 1', () => {
    expect(homogeneity(0)).toBe(0)
    expect(homogeneity(100)).toBeGreaterThan(0.99)
  })
})

// Alle doelen, voor wie een lijst wil
export const ALL_GOALS: readonly GoalId[] = GOAL_IDS
