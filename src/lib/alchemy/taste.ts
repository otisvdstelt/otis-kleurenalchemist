// Smaken sturen het palet: warmer of koeler, lichter of donkerder, feller of zachter, meer of minder contrast

import { lerpHue, type Oklch } from './color.ts'
import type { Ingredient, Taste } from './ingredients.ts'

export const NO_TASTE: Taste = { warmte: 0, licht: 0, chroma: 0, contrast: 0 }

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x))

/** Alle smaken bij elkaar opgeteld. Twee keer hetzelfde potje telt twee keer zo zwaar. Het totaal blijft tussen -1 en 1 */
export function combineTastes(tastes: readonly Ingredient[]): Taste {
  const sum = { ...NO_TASTE }
  for (const t of tastes) {
    if (!t.taste) continue
    sum.warmte += t.taste.warmte
    sum.licht += t.taste.licht
    sum.chroma += t.taste.chroma
    sum.contrast += t.taste.contrast
  }
  return { warmte: clamp1(sum.warmte), licht: clamp1(sum.licht), chroma: clamp1(sum.chroma), contrast: clamp1(sum.contrast) }
}

/** De tinten die de smaken voorstellen, de zwaarste eerst. Bij gelijke stand telt wat er eerst in ging */
export function tasteHues(tastes: readonly Ingredient[]): number[] {
  const seen = new Map<string, { hue: number; count: number; first: number }>()
  tastes.forEach((t, i) => {
    if (t.tint === undefined) return
    const entry = seen.get(t.id)
    if (entry) entry.count++
    else seen.set(t.id, { hue: t.tint, count: 1, first: i })
  })
  return [...seen.values()].sort((a, b) => b.count - a.count || a.first - b.first).map((e) => e.hue)
}

/** Waar warm en koel naartoe draaien */
export const WARM_HUE = 55
export const COOL_HUE = 245

/** Draai een tint warmer of koeler, tot 25 graden bij het uiterste */
export function warmHue(hue: number, warmte: number): number {
  if (Math.abs(warmte) < 1e-6) return hue
  const target = warmte > 0 ? WARM_HUE : COOL_HUE
  const distance = Math.abs(((target - hue + 540) % 360) - 180)
  if (distance < 1) return hue
  return lerpHue(hue, target, Math.min(1, (25 * Math.abs(warmte)) / distance))
}

/** Stuur één kleur met de smaak: tint, lichtheid en chroma */
export function applyTaste(color: Oklch, taste: Taste, lightness = 0.12): Oklch {
  return {
    l: Math.max(0, Math.min(1, color.l + taste.licht * lightness)),
    c: Math.max(0, color.c * (1 + taste.chroma * 0.55)),
    h: warmHue(color.h, taste.warmte),
  }
}
