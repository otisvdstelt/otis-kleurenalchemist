// Eén kleur bijstellen: lichter of donkerder, warmer of koeler, feller of doffer. En rollen wisselen.
// Alles in OKLCH, met de gamut mapping uit CSS Color 4 aan het eind

import { clamp, fromHex, lerpHue, toHex, type Hex } from './color.ts'
import type { Swatch } from './palette.ts'

export type Adjustment = 'lichter' | 'donkerder' | 'warmer' | 'koeler' | 'feller' | 'doffer'

export const ADJUSTMENTS: readonly Adjustment[] = ['lichter', 'donkerder', 'warmer', 'koeler', 'feller', 'doffer']

/** Waar warm en koel naartoe draaien: oranje en blauw */
const WARM = 55
const COOL = 245
/** Zoveel graden per stap, of minder als de tint er al bijna is */
const TURN = 10

function toward(hue: number, target: number): number {
  const distance = Math.abs(((target - hue + 540) % 360) - 180)
  if (distance < 0.5) return hue
  return lerpHue(hue, target, Math.min(1, TURN / distance))
}

/** Stel één kleur een stapje bij */
export function adjust(hex: Hex, how: Adjustment): Hex {
  const c = fromHex(hex)
  switch (how) {
    case 'lichter':
      return toHex({ ...c, l: clamp(c.l + 0.04) })
    case 'donkerder':
      return toHex({ ...c, l: clamp(c.l - 0.04) })
    case 'warmer':
    case 'koeler': {
      // Grijs heeft geen tint om te draaien, dus die krijgt er een beetje bij
      const chroma = Math.max(c.c, 0.02)
      const hue = c.c < 0.01 ? (how === 'warmer' ? WARM : COOL) : toward(c.h, how === 'warmer' ? WARM : COOL)
      return toHex({ ...c, c: chroma, h: hue })
    }
    case 'feller':
      return toHex({ ...c, c: c.c * 1.18 + 0.01 })
    case 'doffer':
      return toHex({ ...c, c: c.c * 0.8 })
  }
}

/** Geef de kleur op plek `from` de rol van plek `to`, en andersom */
export function swapRoles(swatches: readonly Swatch[], from: number, to: number): Swatch[] {
  if (from === to || !swatches[from] || !swatches[to]) return [...swatches]
  return swatches.map((s, i) => (i === from ? { ...s, hex: swatches[to].hex } : i === to ? { ...s, hex: swatches[from].hex } : s))
}
