// Is het leesbaar? Volgens WCAG 2.2, met APCA ernaast als extra informatie

import { fromHex, hexToRgb, linearize, toHex, type Hex } from './color.ts'
import type { Role } from './palette.ts'

/** Relatieve luminantie volgens WCAG 2.2 */
export function luminance(hex: Hex): number {
  const [r, g, b] = hexToRgb(hex).map(linearize)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** De contrastverhouding, van 1 (niks) tot 21 (zwart op wit) */
export function contrastRatio(a: Hex, b: Hex): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Drempels uit WCAG 2.2 */
export const THRESHOLDS = {
  /** Gewone tekst, AA (1.4.3) */
  text: 4.5,
  /** Grote tekst en onderdelen van de interface, AA (1.4.3 en 1.4.11) */
  large: 3,
  /** Gewone tekst, AAA (1.4.6) */
  enhanced: 7,
} as const

/**
 * APCA-W3 0.0.98G-4g, de Lc-waarde van tekst op een achtergrond.
 * Dit is een concept voor WCAG 3 en nog geen standaard. Positief is donker op licht, negatief licht op donker
 */
export function apca(text: Hex, background: Hex): number {
  const screen = (hex: Hex) => {
    const [r, g, b] = hexToRgb(hex)
    const y = 0.2126729 * r ** 2.4 + 0.7151522 * g ** 2.4 + 0.072175 * b ** 2.4
    // Zachte klem bij heel donker
    return y < 0.022 ? y + (0.022 - y) ** 1.414 : y
  }
  const yt = screen(text)
  const yb = screen(background)
  if (Math.abs(yb - yt) < 0.0005) return 0
  if (yb > yt) {
    const sapc = (yb ** 0.56 - yt ** 0.57) * 1.14
    return sapc < 0.1 ? 0 : (sapc - 0.027) * 100
  }
  const sapc = (yb ** 0.65 - yt ** 0.62) * 1.14
  return sapc > -0.1 ? 0 : (sapc + 0.027) * 100
}

/** Hoe goed een paar het doet: AAA, AA, alleen groot genoeg, of niet */
export type Level = 'aaa' | 'aa' | 'groot' | 'nee'

/** Tekst moet lezen, een onderdeel (accent, signaal) moet je kunnen zien, en de tekst op een knop in die kleur ook lezen */
export type PairKind = 'tekst' | 'onderdeel' | 'knop'

export interface Check {
  /** Index van de voorgrond en de achtergrond in het palet */
  fg: number
  bg: number
  fgRole: Role
  bgRole: Role
  kind: PairKind
  ratio: number
  required: number
  passes: boolean
  level: Level
  /** APCA Lc, als extra informatie */
  lc: number
}

/**
 * Hoeveel de lichtheid van `hex` moet schuiven (van `partner` af) voordat tekst in `partner` erop leesbaar is.
 * Infinity als het niet kan
 */
export function shiftNeeded(hex: Hex, partner: Hex, required: number = THRESHOLDS.text): number {
  if (contrastRatio(hex, partner) >= required) return 0
  const own = fromHex(hex)
  const towards = own.l < fromHex(partner).l ? 0 : 1
  const at = (t: number) => toHex({ ...own, l: own.l + (towards - own.l) * t })
  if (contrastRatio(at(1), partner) < required) return Infinity
  let lo = 0
  let hi = 1
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2
    if (contrastRatio(at(mid), partner) >= required) hi = mid
    else lo = mid
  }
  return Math.abs(towards - own.l) * hi
}

/**
 * Welke kleur de tekst op een knop in deze kleur krijgt: de achtergrond of de tekstkleur.
 * Leest er een al goed, dan die (de best leesbare). Anders de kleur waarvoor de knop het minst hoeft te veranderen.
 * Geeft de plek in het palet terug, of -1 als er geen van beide is
 */
export function labelFor(swatches: readonly { hex: Hex; role: Role }[], index: number): number {
  const candidates = [swatches.findIndex((s) => s.role === 'achtergrond'), swatches.findIndex((s) => s.role === 'tekst')].filter((i) => i >= 0)
  if (candidates.length === 0) return -1
  const button = swatches[index].hex
  const ratio = (i: number) => contrastRatio(swatches[i].hex, button)
  const reading = candidates.filter((i) => ratio(i) >= THRESHOLDS.text)
  if (reading.length > 0) return reading.reduce((best, i) => (ratio(i) > ratio(best) ? i : best))
  const shift = (i: number) => shiftNeeded(button, swatches[i].hex)
  return candidates.reduce((best, i) => (shift(i) < shift(best) ? i : best))
}

/**
 * De paren die ertoe doen: tekst op achtergrond en op oppervlak, elk accent en het signaal op de achtergrond,
 * en de tekst op een knop in elk accent en het signaal
 */
export function pairsFor(swatches: readonly { hex: Hex; role: Role }[]): { fg: number; bg: number; kind: PairKind }[] {
  const roles = swatches.map((s) => s.role)
  const background = roles.indexOf('achtergrond')
  const surface = roles.indexOf('oppervlak')
  const text = roles.indexOf('tekst')
  const pairs: { fg: number; bg: number; kind: PairKind }[] = []
  if (text >= 0 && background >= 0) pairs.push({ fg: text, bg: background, kind: 'tekst' })
  if (text >= 0 && surface >= 0) pairs.push({ fg: text, bg: surface, kind: 'tekst' })
  roles.forEach((role, index) => {
    if ((role === 'accent' || role === 'signaal') && background >= 0) pairs.push({ fg: index, bg: background, kind: 'onderdeel' })
  })
  roles.forEach((role, index) => {
    if (role !== 'accent' && role !== 'signaal') return
    const label = labelFor(swatches, index)
    if (label >= 0) pairs.push({ fg: label, bg: index, kind: 'knop' })
  })
  return pairs
}

export const requiredFor = (kind: PairKind) => (kind === 'onderdeel' ? THRESHOLDS.large : THRESHOLDS.text)

function levelOf(ratio: number, kind: PairKind): Level {
  if (kind !== 'onderdeel') return ratio >= THRESHOLDS.enhanced ? 'aaa' : ratio >= THRESHOLDS.text ? 'aa' : ratio >= THRESHOLDS.large ? 'groot' : 'nee'
  // WCAG 1.4.11 kent voor onderdelen alleen AA (3:1). AAA geven we pas bij 7:1, zoals bij tekst
  return ratio >= THRESHOLDS.enhanced ? 'aaa' : ratio >= THRESHOLDS.large ? 'aa' : 'nee'
}

/** Elke relevante combinatie in het palet gemeten */
export function checkPalette(swatches: readonly { hex: Hex; role: Role }[]): Check[] {
  const roles = swatches.map((s) => s.role)
  return pairsFor(swatches).map(({ fg, bg, kind }) => {
    const ratio = contrastRatio(swatches[fg].hex, swatches[bg].hex)
    const required = requiredFor(kind)
    return {
      fg,
      bg,
      fgRole: roles[fg],
      bgRole: roles[bg],
      kind,
      ratio,
      required,
      passes: ratio >= required,
      level: levelOf(ratio, kind),
      lc: apca(swatches[fg].hex, swatches[bg].hex),
    }
  })
}

/** Een verhouding zoals je hem opschrijft: 4,5:1 */
export const formatRatio = (ratio: number) => `${(Math.floor(ratio * 10) / 10).toLocaleString('nl-NL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:1`
