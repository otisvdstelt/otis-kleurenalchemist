// Een palet is een rij kleuren, en elke kleur heeft een rol. De rollen sturen de contrastcheck

import type { Hex } from './color.ts'

/**
 * De rollen die een kleur kan hebben. Welke er in een palet zitten, hangt af van het doel.
 * `signaal` komt uit de eerste versie (v1-links) en wordt niet meer gemaakt
 */
export type Role = 'achtergrond' | 'oppervlak' | 'rand' | 'tekst' | 'zachte-tekst' | 'hoofd' | 'op-hoofd' | 'accent' | 'signaal' | 'goed' | 'let-op' | 'fout' | 'grafiek'

/** Alle rollen, in een vaste volgorde. De plek is het nummer in een deellink */
export const ROLES: readonly Role[] = ['achtergrond', 'oppervlak', 'tekst', 'accent', 'signaal', 'rand', 'zachte-tekst', 'hoofd', 'op-hoofd', 'goed', 'let-op', 'fout', 'grafiek']

export interface Swatch {
  hex: Hex
  role: Role
}

/** De stappen van een reeks, van licht naar donker, zoals Tailwind ze noemt */
export const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type Step = (typeof STEPS)[number]

export type RampName = 'neutraal' | 'hoofd' | 'accent'
export const RAMP_NAMES: readonly RampName[] = ['neutraal', 'hoofd', 'accent']

/** Een reeks van 50 tot 950 in één tint */
export interface Ramp {
  name: RampName
  /** Hex per stap, in de volgorde van STEPS */
  steps: Hex[]
}

export const MIN_SIZE = 3
export const MAX_SIZE = 7
export const DEFAULT_SIZE = 5

/** Welke rollen een palet van n kleuren krijgt, in deze vaste volgorde */
export function rolesFor(size: number): Role[] {
  const n = Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size)))
  if (n === 3) return ['achtergrond', 'tekst', 'accent']
  if (n === 4) return ['achtergrond', 'oppervlak', 'tekst', 'accent']
  const roles: Role[] = ['achtergrond', 'oppervlak', 'tekst', 'accent', 'signaal']
  while (roles.length < n) roles.push('accent')
  return roles
}

export const clampSize = (size: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(size)))

/** Het rangnummer van een kleur binnen zijn rol, voor "accent 2" */
export function roleNumber(swatches: readonly { role: Role }[], index: number): number {
  const role = swatches[index].role
  return swatches.slice(0, index + 1).filter((s) => s.role === role).length
}
