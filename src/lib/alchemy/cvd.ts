// Door de monocle: hoe het palet eruitziet voor iemand die kleuren anders ziet

import { deltaEOK, hexToOklab, hexToRgb, linearize, linearRgbToHex, type Hex } from './color'
import type { Role } from './palette'

export type Vision = 'deuteranopie' | 'protanopie' | 'tritanopie'

export const VISIONS: readonly Vision[] = ['deuteranopie', 'protanopie', 'tritanopie']

/**
 * Machado, Oliveira en Fernandes (2009), ernst 1,0, toegepast op lineair sRGB.
 * Rij voor rij: de nieuwe rood, groen en blauw
 */
const MACHADO: Record<Vision, readonly number[]> = {
  protanopie: [0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998],
  deuteranopie: [0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881],
  tritanopie: [1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039],
}

/** Hoe één kleur eruitziet bij deze vorm van kleurenblindheid */
export function simulate(hex: Hex, vision: Vision): Hex {
  const [r, g, b] = hexToRgb(hex).map(linearize)
  const m = MACHADO[vision]
  return linearRgbToHex(m[0] * r + m[1] * g + m[2] * b, m[3] * r + m[4] * g + m[5] * b, m[6] * r + m[7] * g + m[8] * b)
}

/** Onder dit verschil (delta E OK) zijn twee kleuren niet meer goed uit elkaar te houden */
export const CONFUSABLE = 0.08

export interface Confusion {
  a: number
  b: number
  roles: [Role, Role]
  /** Het verschil zoals iedereen het ziet, en zoals het door de monocle wordt */
  normal: number
  seen: number
}

/**
 * Welke rollen bij deze vorm van kleurenblindheid samenvallen, terwijl je ze normaal wel uit elkaar houdt.
 * Achtergrond en oppervlak horen dicht bij elkaar te liggen, die tellen niet mee
 */
export function confusions(swatches: readonly { hex: Hex; role: Role }[], vision: Vision): Confusion[] {
  const seen = swatches.map((s) => hexToOklab(simulate(s.hex, vision)))
  const normal = swatches.map((s) => hexToOklab(s.hex))
  const found: Confusion[] = []
  for (let a = 0; a < swatches.length; a++) {
    for (let b = a + 1; b < swatches.length; b++) {
      const roles: [Role, Role] = [swatches[a].role, swatches[b].role]
      if (roles.includes('achtergrond') && roles.includes('oppervlak')) continue
      const before = deltaEOK(normal[a], normal[b])
      const after = deltaEOK(seen[a], seen[b])
      if (before >= CONFUSABLE && after < CONFUSABLE) found.push({ a, b, roles, normal: before, seen: after })
    }
  }
  return found
}
