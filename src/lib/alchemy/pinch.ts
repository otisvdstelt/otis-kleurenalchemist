// Een snuifje contrast. Schuift alleen de lichtheid, en zo weinig mogelijk, tot elk paar zijn drempel haalt

import { checkPalette, contrastRatio, luminance, pairsFor, requiredFor, THRESHOLDS, type Check } from './contrast'
import { fromHex, toHex, type Hex } from './color'
import type { Swatch } from './palette'

export interface Pinched {
  swatches: Swatch[]
  /** Welke kleuren verschoven zijn */
  changed: number[]
  /** Paren die ook na het snuifje niet halen, omdat beide kleuren vastzitten onder een kurk */
  unreachable: Check[]
}

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

/** Haalt elk paar dat dit swatch-paar raakt nog zijn drempel, voor zover het dat al deed? */
function keepsOthers(swatches: readonly Swatch[], index: number, candidate: Hex, before: readonly Check[]): boolean {
  const trial = swatches.map((s, i) => (i === index ? { ...s, hex: candidate } : s))
  const after = checkPalette(trial)
  return after.every((check, i) => check.passes || !before[i].passes || (check.fg !== index && check.bg !== index))
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
  if (!fails(text, bg) && !fails(text, surface)) return
  const l = (i: number) => fromHex(swatches[i].hex).l
  // Zwart haalt 4,5:1 op alles met een luminantie vanaf 0,18, en wit op alles daaronder
  const darkText = luminance(swatches[bg].hex) >= 0.18
  const extreme = darkText ? 0 : 1
  const beyond = (a: number, b: number) => (darkText ? Math.min(a, b) : Math.max(a, b))
  const before = (a: number, b: number) => (darkText ? Math.max(a, b) : Math.min(a, b))
  if (fails(text, bg)) {
    const moved = !locked[text] ? search(swatches[text].hex, beyond(l(text), l(bg)), extreme, swatches[bg].hex, THRESHOLDS.text) : null
    if (moved) swatches[text].hex = moved
    else if (!locked[bg]) swatches[bg].hex = search(swatches[bg].hex, before(l(bg), l(text)), 1 - extreme, swatches[text].hex, THRESHOLDS.text) ?? swatches[bg].hex
  }
  if (fails(text, surface) && !locked[surface]) {
    swatches[surface].hex = search(swatches[surface].hex, before(l(surface), l(text)), 1 - extreme, swatches[text].hex, THRESHOLDS.text) ?? swatches[surface].hex
  }
}

/**
 * Voeg een snuifje contrast toe. Kleuren onder een kurk (`locked`) blijven staan.
 * Elk paar wordt eerst opgelost door de voorgrond te verschuiven, en als dat een ander paar breekt, door de achtergrond
 */
export function pinch(input: readonly Swatch[], locked: readonly boolean[] = []): Pinched {
  const swatches = input.map((s) => ({ ...s }))
  const pairs = pairsFor(swatches.map((s) => s.role))

  for (let pass = 0; pass < 4; pass++) {
    let moved = false
    for (const { fg, bg, kind } of pairs) {
      const required = requiredFor(kind)
      if (contrastRatio(swatches[fg].hex, swatches[bg].hex) >= required) continue
      const before = checkPalette(swatches)
      // Eerst de voorgrond, dan de achtergrond
      for (const [mover, partner] of [
        [fg, bg],
        [bg, fg],
      ] as const) {
        if (locked[mover]) continue
        const candidate = nudge(swatches[mover].hex, swatches[partner].hex, required)
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

  // Laatste redmiddel: lukte het zonder iets te breken niet, schuif dan de voorgrond toch
  for (const { fg, bg, kind } of pairs) {
    const required = requiredFor(kind)
    if (contrastRatio(swatches[fg].hex, swatches[bg].hex) >= required) continue
    const mover = !locked[fg] ? fg : !locked[bg] ? bg : -1
    if (mover < 0) continue
    const candidate = nudge(swatches[mover].hex, swatches[mover === fg ? bg : fg].hex, required)
    if (candidate) swatches[mover].hex = candidate
  }

  const changed = swatches.flatMap((s, i) => (s.hex !== input[i].hex ? [i] : []))
  return { swatches, changed, unreachable: checkPalette(swatches).filter((c) => !c.passes) }
}
