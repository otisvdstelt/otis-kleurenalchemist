// Een palet is een rij kleuren, en elke kleur heeft een rol. De rollen sturen de contrastcheck

import type { Hex } from './color.ts'

export type Role = 'achtergrond' | 'oppervlak' | 'tekst' | 'accent' | 'signaal'

export interface Swatch {
  hex: Hex
  role: Role
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
