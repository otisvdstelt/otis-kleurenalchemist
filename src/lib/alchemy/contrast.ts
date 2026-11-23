// Is het leesbaar? Volgens WCAG 2.2, met APCA ernaast als extra informatie

import { hexToRgb, linearize, type Hex } from './color.ts'
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

/** Tekst moet lezen, een onderdeel (accent, signaal) moet je kunnen zien */
export type PairKind = 'tekst' | 'onderdeel'

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

/** De paren die ertoe doen: tekst op achtergrond en op oppervlak, elk accent en het signaal op de achtergrond */
export function pairsFor(roles: readonly Role[]): { fg: number; bg: number; kind: PairKind }[] {
  const background = roles.indexOf('achtergrond')
  const surface = roles.indexOf('oppervlak')
  const text = roles.indexOf('tekst')
  const pairs: { fg: number; bg: number; kind: PairKind }[] = []
  if (text >= 0 && background >= 0) pairs.push({ fg: text, bg: background, kind: 'tekst' })
  if (text >= 0 && surface >= 0) pairs.push({ fg: text, bg: surface, kind: 'tekst' })
  roles.forEach((role, index) => {
    if ((role === 'accent' || role === 'signaal') && background >= 0) pairs.push({ fg: index, bg: background, kind: 'onderdeel' })
  })
  return pairs
}

export const requiredFor = (kind: PairKind) => (kind === 'tekst' ? THRESHOLDS.text : THRESHOLDS.large)

function levelOf(ratio: number, kind: PairKind): Level {
  if (kind === 'tekst') return ratio >= THRESHOLDS.enhanced ? 'aaa' : ratio >= THRESHOLDS.text ? 'aa' : ratio >= THRESHOLDS.large ? 'groot' : 'nee'
  // Een onderdeel heeft geen AAA. Haalt het 4,5, dan kan er ook gewone tekst in die kleur
  return ratio >= THRESHOLDS.text ? 'aaa' : ratio >= THRESHOLDS.large ? 'aa' : 'nee'
}

/** Elke relevante combinatie in het palet gemeten */
export function checkPalette(swatches: readonly { hex: Hex; role: Role }[]): Check[] {
  const roles = swatches.map((s) => s.role)
  return pairsFor(roles).map(({ fg, bg, kind }) => {
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
