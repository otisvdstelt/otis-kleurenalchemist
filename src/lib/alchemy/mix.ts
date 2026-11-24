// De ketel. Een basis, een doel, smaken en kruiden erin, roeren, en er komt een palet uit dat je echt kunt gebruiken.
// Alles in OKLCH. De smaken sturen, het doel bouwt de structuur, en het contrast wordt gemeten en zo nodig rechtgezet

import { Color, mix as spectralMix } from 'spectral.js'
import { chartColours } from './chart.ts'
import { clamp, fromHex, inGamut, lerpHue, lerpOklab, toHex, wrapHue, type Hex, type Oklch } from './color.ts'
import { contrastRatio, type Check } from './contrast.ts'
import { DEFAULT_GOAL, GOALS } from './goals.ts'
import { accentHues } from './harmony.ts'
import { isSpecial, type Effect, type GoalId, type HarmonyId, type Ingredient } from './ingredients.ts'
import { STEPS, type Ramp, type Role, type Step, type Swatch } from './palette.ts'
import { pinch } from './pinch.ts'
import { hash, mulberry32 } from './prng.ts'
import { at, ramp } from './ramps.ts'
import { applyTaste, combineTastes, tasteHues, warmHue } from './taste.ts'

/** Hoe de ketel erbij staat */
export type Boil = 'leeg' | 'rustig' | 'onrustig' | 'overkoken'

/** Vier smaken borrelt onrustig, vijf of meer kookt over. Twee harmonieën tegelijk ook */
export const UNEASY = 4
export const OVERFLOW = 5

export function boilState(tasteCount: number, harmonyCount = 0): Boil {
  if (harmonyCount >= 2 || tasteCount >= OVERFLOW) return 'overkoken'
  if (tasteCount <= 0) return 'leeg'
  if (tasteCount >= UNEASY) return 'onrustig'
  return 'rustig'
}

/** Hoe hard het overkookt, van 0 (niet) tot 1 (helemaal modder). Bij de eerste keer al duidelijk bruin */
export function overflowStrength(tasteCount: number, harmonyCount = 0): number {
  if (boilState(tasteCount, harmonyCount) !== 'overkoken') return 0
  const over = Math.max(tasteCount - OVERFLOW, harmonyCount - 2, 0)
  return Math.min(1, 0.7 + over * 0.2)
}

/** Waar alles naartoe trekt als het overkookt */
export const MUD: Oklch = { l: 0.45, c: 0.05, h: 60 }

/** Van 0 (net erin, nog wild) tot 1 (helemaal rustig). Na tien slagen is het ongeveer tweederde */
export const homogeneity = (stirs: number) => 1 - Math.exp(-Math.max(0, stirs) / 10)

export interface BrewInput {
  /** Smaken, harmonieën en bewerkingen, in de volgorde waarin ze erin gingen. Twee keer hetzelfde is twee keer zo zwaar */
  ingredients: readonly Ingredient[]
  /** Waar het voor is. Standaard een website */
  goal?: GoalId
  /** Jouw kleuren: de eerste wordt de hoofdkleur, de tweede het accent. Ze blijven precies zoals ze zijn */
  bases?: readonly Hex[]
  stirs: number
  /** Uit de eerste versie. Het doel bepaalt nu hoeveel kleuren er zijn */
  size?: number
  /** Kleuren onder een kurk, per plek in het palet. Die blijven staan, de rest verandert */
  corks?: readonly (Hex | null)[]
  /** Hoe vaak er opnieuw geroerd is ("Roer opnieuw"). Elke keer een nieuwe trekking */
  reroll?: number
  /** Een vaste seed, voor een recept uit een flesje. Gaat voor alles */
  seed?: number
}

export interface Brew {
  swatches: Swatch[]
  /** Het palet zoals het uit de ketel kwam, nog zonder water, houtskool of snuifje */
  base: Swatch[]
  /** De reeksen van 50 tot 950 die bij het doel horen */
  ramps: Ramp[]
  goal: GoalId
  harmony: HarmonyId | null
  corked: boolean[]
  /** Welke plekken een basis zijn: die liggen vast */
  locked: boolean[]
  seed: number
  homogeneity: number
  boil: Boil
  /** Hoe hard het overkookt, van 0 tot 1 */
  overflow: number
  /** Modder: overgekookt */
  mud: boolean
  /** Licht palet met donkere tekst, of andersom */
  dark: boolean
  /** De kleur van de damp: de pigmenten van de smaken, gemengd zoals verf mengt */
  blend: Hex
  /** De pigmenten van de smaken, voor de strepen in de draaikolk */
  streaks: { hex: Hex; weight: number }[]
  effects: Record<Effect, number>
  /** Wat het snuifje contrast deed, als het erin zit */
  pinch: { before: Swatch[]; changed: number[]; unreachable: Check[] } | null
}

/**
 * De seed komt uit het recept: de basis, het doel, de smaken, de harmonie, en hoe vaak er opnieuw geroerd is.
 * Niet uit het aantal slagen: roeren maakt het palet rustiger, maar trekt geen nieuw palet. Bewerkingen tellen ook
 * niet mee, die werken pas op het palet dat er al is. De volgorde van de potjes doet er niet toe
 */
export function seedOf(ingredients: readonly Ingredient[], goal: GoalId = DEFAULT_GOAL, bases: readonly Hex[] = [], reroll = 0): number {
  const ids = ingredients
    .filter((i) => !isSpecial(i))
    .map((i) => i.id)
    .sort()
  return hash(`${goal}|${bases.join(',')}|${ids.join('+')}${reroll > 0 ? `|${Math.round(reroll)}` : ''}`)
}

const colorCache = new Map<Hex, Color>()
const spectral = (hex: Hex) => {
  let color = colorCache.get(hex)
  if (!color) {
    color = new Color(hex)
    colorCache.set(hex, color)
  }
  return color
}

/** Meng zoals verf mengt (Kubelka-Munk). Voor de damp en de draaikolk */
function paint(parts: readonly { hex: Hex; weight: number }[]): Oklch {
  const used = parts.filter((p) => p.weight > 1e-6)
  if (used.length === 0) return fromHex('#808080')
  if (used.length === 1) return fromHex(used[0].hex)
  const mixed = spectralMix(...used.map((p): [Color, number] => [spectral(p.hex), p.weight]))
  return fromHex(mixed.toString({ format: 'hex', method: 'map' }).toLowerCase())
}

/** Trek de kleur naar het modderbruin, des te harder naarmate het meer overkookt */
function muddy(color: Oklch, strength: number): Oklch {
  if (strength <= 0) return color
  const pulled = { l: color.l, c: color.c * (1 - 0.85 * strength), h: lerpHue(color.h, MUD.h, strength) }
  return lerpOklab(pulled, MUD, 0.6 * strength)
}

/** Water verdunt, houtskool verdiept */
function treat(color: Oklch, water: number, charcoal: number): Oklch {
  let { l, c } = color
  if (water > 0) {
    l = l + (1 - l) * (1 - 0.8 ** water)
    c = c * 0.7 ** water
  }
  if (charcoal > 0) {
    l = l * 0.88 ** charcoal
    c = c * 0.92 ** charcoal
  }
  return { ...color, l, c }
}

/** Vaste tinten voor goed, let op en fout */
const STATUS: Record<'goed' | 'let-op' | 'fout', { h: number; l: number; dark: number }> = {
  goed: { h: 145, l: 0.55, dark: 0.74 },
  'let-op': { h: 75, l: 0.62, dark: 0.8 },
  fout: { h: 25, l: 0.55, dark: 0.7 },
}

/** Lichte of donkere tekst op een kleur: wat het beste leest */
function textOn(colour: Hex, light: Hex, dark: Hex): Hex {
  return contrastRatio(light, colour) >= contrastRatio(dark, colour) ? light : dark
}

/** Brouw een palet. Hetzelfde recept met hetzelfde aantal slagen geeft altijd precies hetzelfde */
export function brew({ ingredients, goal: goalId = DEFAULT_GOAL, bases = [], stirs, corks = [], reroll = 0, seed: fixed }: BrewInput): Brew | null {
  const tastes = ingredients.filter((i) => i.kind === 'smaak')
  const harmonies = ingredients.filter((i) => i.kind === 'harmonie')
  const effects: Record<Effect, number> = { contrast: 0, water: 0, houtskool: 0 }
  for (const i of ingredients) if (i.effect) effects[i.effect]++
  // Zonder basis en zonder smaak valt er niks te brouwen
  if (tastes.length === 0 && bases.length === 0) return null

  const goal = GOALS[goalId]
  const seed = fixed ?? seedOf(ingredients, goalId, bases, reroll)
  // Altijd evenveel trekkingen, in dezelfde volgorde, wat er ook in de ketel zit. Zo verschuift roeren het palet zacht
  const random = mulberry32(seed)
  const r = Array.from({ length: 24 }, random)
  const h = homogeneity(stirs)
  const wild = 1 - h
  const taste = combineTastes(tastes)
  const hues = tasteHues(tastes)
  const harmony = harmonies[0]?.harmony ?? null
  const boil = boilState(tastes.length, harmonies.length)
  const overflow = overflowStrength(tastes.length, harmonies.length)
  const dark = goal.dark

  // 1. De hoofdkleur: de basis, of anders de tint van de zwaarste smaak, zo licht en fel als het doel wil
  const basis = bases[0] ? fromHex(bases[0]) : null
  let main: Oklch = basis ?? applyTaste({ l: goal.main.l, c: goal.main.c, h: hues[0] ?? r[0] * 360 }, taste, dark ? 0.08 : 0.12)
  if (!basis) main = inGamut({ l: clamp(main.l + (r[1] - 0.5) * 0.08 * wild, 0.3, 0.85), c: main.c * (1 + (r[2] - 0.5) * 0.4 * wild), h: wrapHue(main.h + (r[3] - 0.5) * 36 * wild) })

  // 2 en 3. De accenten: bij een harmonie vanaf de hoofdkleur, anders de tinten van de andere smaken, en anders een buur
  const offsets = harmony ? accentHues(main.h, harmony) : hues.length > 1 ? hues.slice(1) : [wrapHue(main.h + (r[4] > 0.5 ? 1 : -1) * (30 + r[5] * 20)), wrapHue(main.h + 150 + r[6] * 60)]
  const accentList: Oklch[] = offsets.slice(0, goal.accents).map((hue, k) => {
    const sameHue = harmony === 'een-tint'
    const base = applyTaste({ l: goal.accent.l + (sameHue ? (k === 0 ? 0.12 : -0.14) : 0), c: goal.accent.c, h: harmony || hues.length > 1 ? hue : hue }, { ...taste, warmte: taste.warmte * 0.6 }, dark ? 0.08 : 0.12)
    return inGamut({ l: clamp(base.l + (r[7 + k] - 0.5) * 0.08 * wild, 0.3, 0.88), c: base.c * (1 + (r[9 + k] - 0.5) * 0.4 * wild), h: wrapHue(base.h + (r[11 + k] - 0.5) * 40 * wild) })
  })
  const secondBasis = bases[1] ? fromHex(bases[1]) : null
  if (secondBasis) accentList[0] = secondBasis

  // De chroma van het hele palet: smaken maken het feller of zachter
  const chromaLevel = clamp(1 + taste.chroma * 0.5, 0.35, 1.6)

  // 4. De reeksen. Neutralen zijn heel licht getint met de hoofdkleur, warmer of koeler naar de smaak
  const neutralHue = warmHue(main.h, taste.warmte * 0.8)
  const neutralChroma = clamp(0.012 + 0.012 * Math.abs(taste.warmte) + 0.006 * Math.max(0, taste.chroma), 0.004, 0.035)
  const rampFor = (name: Ramp['name']): Ramp => {
    if (name === 'neutraal') return ramp('neutraal', neutralHue, neutralChroma)
    if (name === 'hoofd') return ramp('hoofd', main.h, Math.max(0.03, main.c), bases[0])
    return ramp('accent', accentList[0]?.h ?? wrapHue(main.h + 30), Math.max(0.03, accentList[0]?.c ?? goal.accent.c), bases[1])
  }
  let ramps = goal.ramps.map(rampFor)
  const rampOf = (name: Ramp['name']) => ramps.find((x) => x.name === name) ?? rampFor(name)
  const n = rampOf('neutraal')
  const strong = taste.contrast > 0.25
  const soft = taste.contrast < -0.25

  // 5. De rollen, per doel uit de reeksen
  const status = (role: 'goed' | 'let-op' | 'fout'): Oklch => {
    const s = STATUS[role]
    return { l: dark ? s.dark : s.l, c: 0.13 * chromaLevel, h: s.h }
  }
  // De stappen liggen vast, maar een lichte smaak pakt een lichtere stap en een diepe smaak een donkere
  const lift = taste.licht > 0.1 ? -1 : taste.licht < -0.1 ? 1 : 0
  const step = (base: number) => STEPS[Math.max(0, Math.min(STEPS.length - 1, STEPS.indexOf(base as Step) + lift))]
  const mainHex = bases[0] ?? (goal.ramps.includes('hoofd') ? at(rampOf('hoofd'), step(dark ? 400 : 600)) : toHex(main))
  const accentHex = (k: number) => {
    if (k === 0 && bases[1]) return bases[1]
    const a = accentList[k] ?? accentList[0] ?? main
    if (k === 0 && goal.ramps.includes('accent')) return at(rampOf('accent'), step(dark ? 400 : 600))
    // Op een licht scherm iets donkerder, zodat een accent opvalt. Een affiche mag fel en licht blijven
    return toHex(inGamut(dark ? { ...a, c: a.c * 0.85 } : goal.id === 'affiche' ? a : { ...a, l: Math.min(a.l, 0.52) }))
  }
  const chart = goal.id === 'presentatie' ? chartColours(fromHex(mainHex), at(n, 50)) : []
  let accentIndex = 0
  let chartIndex = 0

  const pick = (role: Role): Hex => {
    switch (role) {
      case 'achtergrond':
        // Een affiche krijgt een lichte achtergrond in de tint van de hoofdkleur: warm bij oranje, koel bij blauw
        if (goal.id === 'affiche') return toHex(inGamut({ l: soft ? 0.9 : 0.95, c: 0.04 * chromaLevel, h: main.h }))
        return dark ? (strong ? '#0b0c0e' : at(n, 950)) : strong ? at(n, 50) : at(n, 50)
      case 'oppervlak':
        return dark ? at(n, 900) : at(n, 100)
      case 'rand':
        return dark ? at(n, 800) : at(n, 200)
      case 'tekst':
        if (goal.id === 'affiche') return toHex(inGamut({ l: strong ? 0.16 : 0.2, c: 0.04, h: main.h }))
        return dark ? at(n, 50) : at(n, strong ? 950 : 900)
      case 'zachte-tekst':
        return dark ? at(n, strong ? 200 : 300) : at(n, strong ? 800 : 700)
      case 'hoofd':
        if (goal.id === 'affiche' && !bases[0]) return toHex(inGamut({ ...main, c: Math.max(main.c, 0.2) * chromaLevel }))
        return mainHex
      case 'op-hoofd':
        return textOn(mainHex, at(n, 50), at(n, 950))
      case 'accent': {
        const hex = accentHex(accentIndex++)
        // Fel, maar donker genoeg om op de lichte achtergrond op te vallen
        if (goal.id === 'affiche' && !bases[1]) return toHex(inGamut({ ...fromHex(hex), l: Math.min(fromHex(hex).l, 0.58), c: Math.max(fromHex(hex).c, 0.18) * chromaLevel }))
        return hex
      }
      case 'goed':
      case 'let-op':
      case 'fout':
        return toHex(inGamut(status(role)))
      case 'grafiek':
        return chart[chartIndex++] ?? mainHex
      case 'signaal':
        return accentHex(1)
    }
  }
  let swatches: Swatch[] = goal.roles.map((role) => ({ role, hex: pick(role) }))
  // Een tweede accent als de harmonie of de smaken er twee geven, en het doel er ruimte voor heeft
  if (goal.accents > 1 && accentList.length > 1 && goal.roles.includes('accent')) {
    const at2 = swatches.findIndex((s) => s.role === 'accent') + 1
    swatches.splice(at2, 0, { role: 'accent', hex: accentHex(1) })
  }

  // De basis ligt vast: hoofd (en het eerste accent bij een tweede basis) blijven exact
  const locked = swatches.map((s, i) => (s.role === 'hoofd' && Boolean(bases[0])) || (Boolean(bases[1]) && i === swatches.findIndex((x) => x.role === 'accent')))

  // Overkoken: alles wat niet vastligt trekt naar modder, ook de reeksen
  if (overflow > 0) {
    swatches = swatches.map((s, i) => (locked[i] ? s : { ...s, hex: toHex(muddy(fromHex(s.hex), overflow)) }))
    ramps = ramps.map((x) => ({ ...x, steps: x.steps.map((hex) => (hex === bases[0] || hex === bases[1] ? hex : toHex(muddy(fromHex(hex), overflow)))) }))
  }

  // Kurken: wat vastzit, blijft staan
  const corked = swatches.map((_, i) => Boolean(corks[i]))
  swatches = swatches.map((s, i) => (corks[i] ? { ...s, hex: corks[i]! } : s))
  const fixed_ = swatches.map((_, i) => locked[i] || corked[i])

  // Leesbaar vanaf het begin: tekst en de tekst op knoppen halen altijd hun drempel. Alleen lichtheid, zo weinig mogelijk.
  // Of onderdelen (accenten, meldingen) genoeg opvallen, laat het palet zien. Daar is het snuifje voor
  swatches = pinch(swatches, fixed_, ['tekst', 'knop']).swatches

  const base = swatches.map((s) => ({ ...s }))
  // Water en houtskool werken op het palet zoals het al was
  if (effects.water > 0 || effects.houtskool > 0) swatches = swatches.map((s, i) => (fixed_[i] ? s : { ...s, hex: toHex(treat(fromHex(s.hex), effects.water, effects.houtskool)) }))

  // 6. Het snuifje contrast: alleen lichtheid, en zo weinig mogelijk
  let pinched: Brew['pinch'] = null
  if (effects.contrast > 0) {
    const result = pinch(swatches, fixed_)
    pinched = { before: swatches, changed: result.changed, unreachable: result.unreachable }
    swatches = result.swatches
  }

  // De damp: de pigmenten van de smaken, gemengd zoals verf. Zonder smaak de hoofdkleur
  const parts = tastes.flatMap((t) => {
    const total = t.pigments.reduce((sum, p) => sum + p.weight, 0) || 1
    return t.pigments.map((p) => ({ hex: toHex(p.color), weight: p.weight / total / tastes.length }))
  })
  const blend = parts.length ? muddy(paint(parts), overflow) : fromHex(mainHex)

  return {
    swatches,
    base,
    ramps,
    goal: goalId,
    harmony,
    corked,
    locked,
    seed,
    homogeneity: h,
    boil,
    overflow,
    mud: overflow > 0,
    dark,
    blend: toHex(blend),
    streaks: parts.length ? parts : [{ hex: mainHex, weight: 1 }],
    effects,
    pinch: pinched,
  }
}
