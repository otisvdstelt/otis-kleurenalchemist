// Een snuifje contrast. Schuift alleen de lichtheid, en zo weinig mogelijk, tot elk paar zijn drempel haalt

import { checkPalette, contrastRatio, luminance, pairsFor, requiredFor, THRESHOLDS, type Check } from './contrast.ts'
import { fromHex, toHex, type Hex } from './color.ts'
import type { Swatch } from './palette.ts'

export interface Pinched {
  swatches: Swatch[]
  /** Welke kleuren verschoven zijn */
  changed: number[]
  /** Paren die ook na het snuifje niet halen, omdat beide kleuren vastzitten onder een kurk */
  unreachable: Check[]
}

/**
 * Het snuifje mikt net boven de drempel: 4,6 in plaats van 4,5 en 3,1 in plaats van 3,0.
 * Zo haalt het palet de drempel ook na afronden, en in een browser die iets anders rekent
 */
const MARGIN = 0.1

/** Zet de lichtheid van een kleur op l, met tint en chroma zoveel mogelijk zoals ze waren */
function withLightness(hex: Hex, l: number): Hex {
  const color = fromHex(hex)
  return toHex({ ...color, l })
}

/**
 * Zoek de kleinste verschuiving van de lichtheid van `hex` in de richting van `towards` (0 of 1),
 * waarmee het contrast tegen `partner` minstens `required` is. Geeft null als zelfs het uiterste niet genoeg is
 */
function search(hex: Hex, from: number, towards: number, partner: Hex, required: number): Hex | null {
  const at = (t: number) => withLightness(hex, from + (towards - from) * t)
  if (contrastRatio(at(1), partner) < required) return null
  let lo = 0
  let hi = 1
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2
    if (contrastRatio(at(mid), partner) >= required) hi = mid
    else lo = mid
  }
  return at(hi)
}

/** Probeer eerst van de partner af te bewegen, en anders de andere kant op, er voorbij */
function nudge(hex: Hex, partner: Hex, required: number): Hex | null {
  if (contrastRatio(hex, partner) >= required) return hex
  const own = fromHex(hex).l
  const other = fromHex(partner).l
  const away = own < other || (own === other && other > 0.5) ? 0 : 1
  return search(hex, own, away, partner, required) ?? search(hex, other, 1 - away, partner, required)
}

/** Eerst mikken op net boven de drempel, en lukt dat niet, dan op de drempel zelf */
function reach(hex: Hex, partner: Hex, required: number): Hex | null {
  return nudge(hex, partner, required + MARGIN) ?? nudge(hex, partner, required)
}

/** Breekt deze verschuiving een paar dat zijn drempel al haalde? Vergeleken per paar, want de knoptekst kan van kleur wisselen */
function keepsOthers(swatches: readonly Swatch[], index: number, candidate: Hex, before: readonly Check[]): boolean {
  const key = (c: Check) => `${c.fg}>${c.bg}:${c.kind}`
  const passedBefore = new Set(before.filter((c) => c.passes).map(key))
  const trial = swatches.map((s, i) => (i === index ? { ...s, hex: candidate } : s))
  return checkPalette(trial).every((check) => check.passes || !passedBefore.has(key(check)) || (check.fg !== index && check.bg !== index))
}

/**
 * Valt de tekst tussen achtergrond en oppervlak in, dan lukt het niet door alleen de tekst te verschuiven.
 * Dan gaat de tekst naar de kant die tegen de achtergrond altijd haalbaar is, en schuift het oppervlak naar de achtergrond toe
 */
function settleText(swatches: Swatch[], locked: readonly boolean[]) {
  const roles = swatches.map((s) => s.role)
  const [bg, surface, text] = (['achtergrond', 'oppervlak', 'tekst'] as const).map((role) => roles.indexOf(role))
  if (bg < 0 || text < 0) return
  const fails = (a: number, b: number) => b >= 0 && contrastRatio(swatches[a].hex, swatches[b].hex) < THRESHOLDS.text
  const target = THRESHOLDS.text + MARGIN
  if (!fails(text, bg) && !fails(text, surface)) return
  const l = (i: number) => fromHex(swatches[i].hex).l
  // Zwart haalt 4,5:1 op alles met een luminantie vanaf 0,18, en wit op alles daaronder
  const darkText = luminance(swatches[bg].hex) >= 0.18
  const extreme = darkText ? 0 : 1
  const beyond = (a: number, b: number) => (darkText ? Math.min(a, b) : Math.max(a, b))
  const before = (a: number, b: number) => (darkText ? Math.max(a, b) : Math.min(a, b))
  if (fails(text, bg)) {
    const moved = !locked[text] ? (search(swatches[text].hex, beyond(l(text), l(bg)), extreme, swatches[bg].hex, target) ?? search(swatches[text].hex, beyond(l(text), l(bg)), extreme, swatches[bg].hex, THRESHOLDS.text)) : null
    if (moved) swatches[text].hex = moved
    else if (!locked[bg]) swatches[bg].hex = search(swatches[bg].hex, before(l(bg), l(text)), 1 - extreme, swatches[text].hex, target) ?? search(swatches[bg].hex, before(l(bg), l(text)), 1 - extreme, swatches[text].hex, THRESHOLDS.text) ?? swatches[bg].hex
  }
  if (fails(text, surface) && !locked[surface]) {
    swatches[surface].hex = search(swatches[surface].hex, before(l(surface), l(text)), 1 - extreme, swatches[text].hex, target) ?? search(swatches[surface].hex, before(l(surface), l(text)), 1 - extreme, swatches[text].hex, THRESHOLDS.text) ?? swatches[surface].hex
  }
}

/**
 * Een knopkleur (accent of signaal) moet twee dingen tegelijk: opvallen tegen de achtergrond (3:1),
 * en tekst erop moet leesbaar zijn (4,5:1, in de achtergrond- of tekstkleur, wat het best leest).
 * Zoek de kleinste verschuiving van de lichtheid waarbij allebei lukt. Ver genoeg van de achtergrond af lukt het altijd
 */
function fitButton(swatches: Swatch[], index: number): boolean {
  const bg = swatches.findIndex((s) => s.role === 'achtergrond')
  if (bg < 0) return true
  const labels = [bg, swatches.findIndex((s) => s.role === 'tekst')].filter((i) => i >= 0)
  // Genoeg als hij opvalt tegen de achtergrond en er óf lichte óf donkere tekst op leest
  const fits = (hex: Hex, margin: number) => contrastRatio(hex, swatches[bg].hex) >= THRESHOLDS.large + margin && labels.some((l) => contrastRatio(hex, swatches[l].hex) >= THRESHOLDS.text + margin)
  if (fits(swatches[index].hex, 0)) return true
  const own = fromHex(swatches[index].hex).l
  for (const margin of [MARGIN, 0]) {
    for (let d = 0.004; d <= 1; d += 0.004) {
      for (const l of [own + d, own - d]) {
        if (l < 0 || l > 1) continue
        const candidate = withLightness(swatches[index].hex, l)
        if (fits(candidate, margin)) {
          swatches[index].hex = candidate
          return true
        }
      }
    }
  }
  return false
}

/**
 * Voeg een snuifje contrast toe. Kleuren onder een kurk (`locked`) blijven staan.
 * Elk paar wordt eerst opgelost door de voorgrond te verschuiven, en als dat een ander paar breekt, door de achtergrond
 */
export function pinch(input: readonly Swatch[], locked: readonly boolean[] = []): Pinched {
  const swatches = input.map((s) => ({ ...s }))

  for (let pass = 0; pass < 5; pass++) {
    let moved = false
    // Opnieuw elke ronde: welke kleur de knoptekst krijgt, kan veranderen als het accent schuift
    for (const { fg, bg, kind } of pairsFor(swatches)) {
      const required = requiredFor(kind)
      if (contrastRatio(swatches[fg].hex, swatches[bg].hex) >= required) continue
      const before = checkPalette(swatches)
      // Eerst de voorgrond, dan de achtergrond. Bij een knop eerst de knop zelf: die is het minst belangrijk
      // Bij tekst op de hoofdkleur eerst die tekst: de hoofdkleur zelf is het belangrijkst
      const textFirst = kind !== 'knop' || swatches[fg].role === 'op-hoofd'
      const order: (readonly [number, number])[] = textFirst ? [[fg, bg], [bg, fg]] : [[bg, fg], [fg, bg]]
      for (const [mover, partner] of order) {
        if (locked[mover]) continue
        const candidate = reach(swatches[mover].hex, swatches[partner].hex, required)
        if (candidate && keepsOthers(swatches, mover, candidate, before)) {
          swatches[mover].hex = candidate
          moved = true
          break
        }
      }
    }
    if (!moved) break
  }

  settleText(swatches, locked)

  // Elke knopkleur die nog niet past, op zijn eigen manier passend maken
  const failing = () => new Set(checkPalette(swatches).filter((c) => !c.passes && c.kind !== 'tekst').flatMap((c) => [c.fg, c.bg]))
  for (const index of failing()) {
    const role = swatches[index].role
    const ownLabel = role === 'hoofd' && swatches.some((s) => s.role === 'op-hoofd')
    if (locked[index] || !(role === 'accent' || role === 'signaal' || (role === 'hoofd' && !ownLabel))) continue
    fitButton(swatches, index)
  }

  // Laatste redmiddel: lukte het zonder iets te breken niet, schuif dan toch. Bij een knop de knop, anders de voorgrond
  for (let pass = 0; pass < 3; pass++) {
    for (const { fg, bg, kind } of pairsFor(swatches)) {
      const required = requiredFor(kind)
      if (contrastRatio(swatches[fg].hex, swatches[bg].hex) >= required) continue
      const first = kind === 'knop' && swatches[fg].role !== 'op-hoofd' ? bg : fg
      const second = first === fg ? bg : fg
      const mover = !locked[first] ? first : !locked[second] ? second : -1
      if (mover < 0) continue
      const candidate = reach(swatches[mover].hex, swatches[mover === fg ? bg : fg].hex, required)
      if (candidate) swatches[mover].hex = candidate
    }
  }

  const changed = swatches.flatMap((s, i) => (s.hex !== input[i].hex ? [i] : []))
  return { swatches, changed, unreachable: checkPalette(swatches).filter((c) => !c.passes) }
}
