// Kleurtheorie: waar de accenten staan ten opzichte van de hoofdkleur, in graden op de kleurcirkel

import { wrapHue } from './color.ts'
import type { HarmonyId } from './ingredients.ts'

export const HARMONIES: Record<HarmonyId, readonly number[]> = {
  complementair: [180],
  analoog: [30, -30],
  drieklank: [120, 240],
  gesplitst: [150, 210],
  // Eén tint: de accenten blijven in dezelfde tint, en verschillen alleen in lichtheid
  'een-tint': [0, 0],
}

/** De tinten van de accenten bij deze harmonie */
export function accentHues(main: number, harmony: HarmonyId): number[] {
  return HARMONIES[harmony].map((d) => wrapHue(main + d))
}
