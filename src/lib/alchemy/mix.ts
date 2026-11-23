// De ketel. Ingrediënten erin, roeren, en er komt een palet uit.
// Alles in OKLab en OKLCH, en waar pigmenten echt door elkaar gaan spectraal, zoals verf mengt

import { Color, mix as spectralMix } from 'spectral.js'
import { clamp, deltaEOK, fromHex, lerpHue, lerpOklab, meanHue, toHex, type Hex, type Oklch } from './color.ts'
import type { Check } from './contrast.ts'
import { isSpecial, type Effect, type Ingredient } from './ingredients.ts'
import { clampSize, rolesFor, type Role, type Swatch } from './palette.ts'
import { pinch } from './pinch.ts'
import { hash, mulberry32, weighted, type Random } from './prng.ts'

/** Hoe de ketel erbij staat */
export type Boil = 'leeg' | 'rustig' | 'onrustig' | 'overkoken'

/** Vanaf vijf kleuringrediënten borrelt het onrustig, vanaf zes kookt het over */
export const UNEASY = 5
export const OVERFLOW = 6

/** Speciale ingrediënten (contrast, water, houtskool) tellen niet mee voor het overkoken */
export function boilState(colourCount: number): Boil {
  if (colourCount <= 0) return 'leeg'
  if (colourCount < UNEASY) return 'rustig'
  if (colourCount < OVERFLOW) return 'onrustig'
  return 'overkoken'
}

/** Hoe hard het overkookt, van 0 (niet) tot 1 (helemaal modder) */
export function overflowStrength(colourCount: number): number {
  return colourCount < OVERFLOW ? 0 : Math.min(1, (colourCount - UNEASY) / 3)
}

/** Waar alles naartoe trekt als het overkookt */
export const MUD: Oklch = { l: 0.45, c: 0.05, h: 60 }

/** Van 0 (net erin, vol strepen) tot 1 (helemaal glad). Na tien slagen is het ongeveer tweederde */
export const homogeneity = (stirs: number) => 1 - Math.exp(-Math.max(0, stirs) / 10)

export interface BrewInput {
  /** In de volgorde waarin ze erin gingen. Twee keer hetzelfde potje is twee keer zoveel */
  ingredients: readonly Ingredient[]
  stirs: number
  /** Aantal kleuren in het palet, 3 tot 7 */
  size: number
  /** Kleuren onder een kurk, per plek in het palet. Die blijven staan, de rest verandert */
  corks?: readonly (Hex | null)[]
}

export interface Brew {
  swatches: Swatch[]
  corked: boolean[]
  seed: number
  homogeneity: number
  boil: Boil
  /** Modder: overgekookt, of zo gemengd dat alle kleur eruit is */
  mud: boolean
  /** Licht palet met donkere tekst, of andersom */
  dark: boolean
  /** Alles samen gemengd. Dat is de kleur van de damp */
  blend: Hex
  /** De pigmenten zoals ze erin gingen, voor de strepen in de draaikolk */
  streaks: { hex: Hex; weight: number }[]
  effects: Record<Effect, number>
  /** Wat het snuifje contrast deed, als het erin zit */
  pinch: { before: Swatch[]; changed: number[]; unreachable: Check[] } | null
}

/** De seed komt uit het recept en het aantal slagen. De volgorde van de potjes doet er niet toe */
export function seedOf(ingredients: readonly Ingredient[], stirs: number, size: number): number {
  const ids = ingredients.map((i) => i.id).sort()
  return hash(`${ids.join('+')}|${Math.max(0, Math.round(stirs))}|${clampSize(size)}`)
}

interface Part {
  hex: Hex
  color: Oklch
  weight: number
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

/** Meng zoals verf mengt (Kubelka-Munk). Één pigment hoeft niet gemengd te worden */
function paint(parts: readonly { hex: Hex; weight: number }[]): Oklch {
  const used = parts.filter((p) => p.weight > 1e-6)
  if (used.length === 0) return fromHex('#808080')
  if (used.length === 1) return fromHex(used[0].hex)
  const mixed = spectralMix(...used.map((p): [Color, number] => [spectral(p.hex), p.weight]))
  return fromHex(mixed.toString({ format: 'hex', method: 'map' }).toLowerCase())
}

/**
 * Pigmenten naar beurt, gewogen getrokken zonder terugleggen. Daarna begint het rondje opnieuw.
 * Felle pigmenten hebben meer kans, anders verdwijnt het neon tussen de rest
 */
function dominantOrder(random: Random, parts: readonly Part[], count: number): number[] {
  const order: number[] = []
  while (order.length < count) {
    const left = parts.map((p, i) => ({ i, w: p.weight * (0.4 + 6 * p.color.c) }))
    while (left.length && order.length < count) {
      const k = weighted(
        random,
        left.map((x) => x.w),
      )
      order.push(left[k].i)
      left.splice(k, 1)
    }
  }
  return order
}

/** Trek de kleur naar het modderbruin, des te harder naarmate het meer overkookt */
function muddy(color: Oklch, strength: number, hue: number): Oklch {
  if (strength <= 0) return color
  const pulled = { l: color.l, c: color.c * (1 - 0.75 * strength), h: lerpHue(color.h, hue, strength) }
  return lerpOklab(pulled, MUD, 0.6 * strength)
}

/** Zet de kleuren op een rij met bruikbare lichtheden, en geef elke kleur een rol */
function spread(random: Random, colors: Oklch[], roles: readonly Role[], dark: boolean, vivid: boolean, shift: number): Oklch[] {
  const byLight = colors.map((c, i) => ({ c, i })).sort((a, b) => a.c.l - b.c.l)
  const lightest = byLight[byLight.length - 1].i
  const darkest = byLight[0].i
  const backgroundAt = dark ? darkest : lightest
  const textAt = dark ? lightest : darkest
  const rest = byLight.map((x) => x.i).filter((i) => i !== backgroundAt && i !== textAt)
  // Het oppervlak is de kleur die het dichtst bij de achtergrond ligt
  const surfaceAt = roles.includes('oppervlak') ? (dark ? rest[0] : rest[rest.length - 1]) : -1
  const accents = rest.filter((i) => i !== surfaceAt)
  // Het signaal is de felste van de rest
  const signalAt = roles.includes('signaal') ? accents.reduce((best, i) => (colors[i].c > colors[best].c ? i : best), accents[0]) : -1
  const accentAt = accents.filter((i) => i !== signalAt)

  const out = new Array<Oklch>(roles.length)
  const place = (role: Role, color: Oklch) => {
    // Bij meer dan één accent: de eerste plek met die rol die nog leeg is
    out[roles.findIndex((r, i) => r === role && out[i] === undefined)] = color
  }

  const bg = colors[backgroundAt]
  const tx = colors[textAt]
  if (dark) {
    place('achtergrond', { ...bg, l: Math.min(bg.l, 0.15 + random() * 0.06), c: Math.min(bg.c, 0.05) })
    place('tekst', { ...tx, l: Math.max(tx.l, 0.9 + random() * 0.06), c: Math.min(tx.c, 0.05) })
  } else {
    place('achtergrond', { ...bg, l: Math.max(bg.l, Math.min(0.985, 0.93 + Math.min(0, shift) + random() * 0.045)), c: Math.min(bg.c, 0.035) })
    place('tekst', { ...tx, l: Math.min(tx.l, 0.2 + random() * 0.08), c: Math.min(tx.c, 0.08) })
  }
  const background = out[roles.indexOf('achtergrond')]
  if (surfaceAt >= 0) {
    const s = colors[surfaceAt]
    const step = 0.045 + random() * 0.035
    place('oppervlak', { ...s, l: clamp(background.l + (dark ? step : -step)), c: Math.min(s.c, 0.06) })
  }
  // Accenten in het middengebied, en niet allemaal even licht. Water schuift ze omhoog, houtskool omlaag
  const low = clamp((dark ? 0.58 : 0.4) + shift, 0.3, 0.8)
  const high = clamp((dark ? 0.86 : 0.74) + shift, low + 0.1, 0.9)
  const mids = accentAt.map((i) => ({ ...colors[i], l: clamp(colors[i].l, low, high) })).sort((a, b) => a.l - b.l)
  for (let k = 1; k < mids.length; k++) {
    if (mids[k].l - mids[k - 1].l < 0.07) mids[k].l = Math.min(high, mids[k - 1].l + 0.07)
  }
  for (const m of mids) place('accent', m)
  if (signalAt >= 0) {
    const s = colors[signalAt]
    const signal = { ...s, l: clamp(s.l, clamp((dark ? 0.62 : 0.48) + shift, 0.3, 0.8), clamp((dark ? 0.82 : 0.68) + shift, 0.45, 0.9)), c: vivid && s.c > 0.03 ? Math.max(s.c, 0.13) : s.c }
    // Het signaal moet opvallen tussen de accenten, dus nooit bijna hetzelfde
    for (const m of mids) {
      if (deltaEOK(signal, m) < 0.06) signal.l = clamp(m.l + (m.l > (low + high) / 2 ? -0.12 : 0.12), 0.25, 0.92)
    }
    place('signaal', signal)
  }
  return out
}

/** Water verdunt, houtskool verdiept */
function treat(color: Oklch, water: number, charcoal: number): Oklch {
  let { l, c } = color
  if (water > 0) {
    l = l + (1 - l) * (1 - 0.72 ** water)
    c = c * 0.62 ** water
  }
  if (charcoal > 0) {
    l = l * 0.8 ** charcoal
    c = c * 0.9 ** charcoal
  }
  return { ...color, l, c }
}

/** Brouw een palet. Hetzelfde recept met hetzelfde aantal slagen geeft altijd precies hetzelfde */
export function brew({ ingredients, stirs, size, corks = [] }: BrewInput): Brew | null {
  // Op id gesorteerd, zodat de volgorde van de potjes niet uitmaakt
  const colours = ingredients.filter((i) => !isSpecial(i)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const effects: Record<Effect, number> = { contrast: 0, water: 0, houtskool: 0 }
  for (const i of ingredients) if (i.effect) effects[i.effect]++
  if (colours.length === 0) return null

  const n = clampSize(size)
  const roles = rolesFor(n)
  const seed = seedOf(ingredients, stirs, n)
  const random = mulberry32(seed)
  const h = homogeneity(stirs)
  const boil = boilState(colours.length)
  const overflow = overflowStrength(colours.length)

  // Elk potje telt even zwaar, verdeeld over zijn eigen pigmenten
  const parts: Part[] = colours.flatMap((ingredient) => {
    const total = ingredient.pigments.reduce((sum, p) => sum + p.weight, 0)
    return ingredient.pigments.map((p) => {
      const hex = toHex(p.color)
      return { hex, color: fromHex(hex), weight: p.weight / total / colours.length }
    })
  })
  const hue = meanHue(parts.map((p) => ({ color: p.color, weight: p.weight })))
  const blendRaw = paint(parts)
  const blend = muddy(blendRaw, overflow, hue)

  // Elke plek in het palet is een eigen streep: weinig geroerd vooral één pigment, veel geroerd vooral het geheel
  const order = dominantOrder(random, parts, n)
  const slots = order.map((dominant) => {
    const second = weighted(
      random,
      parts.map((p) => p.weight),
    )
    const streak = (1 - h) * (0.12 + random() * 0.3)
    const weights = parts.map((p, j) => (1 - h) * (j === dominant ? 1 : 0) + (1 - h) * (j === second ? streak : 0) + h * p.weight)
    const color = paint(parts.map((p, j) => ({ hex: p.hex, weight: weights[j] })))
    // Een beetje verschil in lichtheid, minder naarmate het gladder is
    const jitter = (random() - 0.5) * 0.14 * (1 - 0.6 * h)
    return muddy({ ...color, l: clamp(color.l + jitter) }, overflow, hue)
  })

  // Licht of donker palet: houtskool en een donkere menging maken het donker, water licht
  const lightness = blend.l + 0.1 * effects.water - 0.14 * effects.houtskool
  const dark = lightness < 0.42
  const inputChroma = parts.reduce((sum, p) => sum + p.color.c * p.weight, 0)
  const mixedAway = colours.length >= 2 && inputChroma > 0.08 && blendRaw.c < 0.045 && h >= 0.5
  const mud = boil === 'overkoken' || mixedAway

  // Water en houtskool werken op de strepen, voordat de lichtheden verdeeld worden. Zo blijft de tekst leesbaar
  const treatedSlots = slots.map((c) => treat(c, effects.water, effects.houtskool))
  const shift = 0.06 * effects.water - 0.07 * effects.houtskool
  const treated = spread(random, treatedSlots, roles, dark, !mud, shift)
  const corked = roles.map((_, i) => Boolean(corks[i]))
  let swatches: Swatch[] = treated.map((c, i) => ({ hex: corks[i] ?? toHex(c), role: roles[i] }))

  let pinched: Brew['pinch'] = null
  if (effects.contrast > 0) {
    const result = pinch(swatches, corked)
    pinched = { before: swatches, changed: result.changed, unreachable: result.unreachable }
    swatches = result.swatches
  }

  return {
    swatches,
    corked,
    seed,
    homogeneity: h,
    boil,
    mud,
    dark,
    blend: toHex(blend),
    streaks: parts.map((p) => ({ hex: p.hex, weight: p.weight })),
    effects,
    pinch: pinched,
  }
}
