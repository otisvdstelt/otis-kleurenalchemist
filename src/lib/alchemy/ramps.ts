// Reeksen van 50 tot 950 in OKLCH: de lichtheid in vaste stappen, de chroma het hoogst in het midden

import { clamp, deltaEOK, fromHex, inGamut, toHex, type Hex, type Oklch } from './color.ts'
import { STEPS, type Ramp, type RampName } from './palette.ts'

/** De lichtheid per stap, van 50 tot 950 */
export const STEP_LIGHTNESS = [0.975, 0.94, 0.885, 0.81, 0.71, 0.62, 0.54, 0.465, 0.39, 0.315, 0.24] as const

/** Hoeveel van de volle chroma een stap krijgt: het meest rond 500 en 600, minder naar de uiteinden */
export function chromaShare(l: number): number {
  const x = (l - 0.58) / 0.42
  return 0.28 + 0.72 * Math.max(0, 1 - x * x)
}

/**
 * Een reeks in één tint. Met `exact` komt die kleur er letterlijk in, op de stap met de dichtstbijzijnde lichtheid.
 * Zo blijft een basis precies wat je gaf
 */
export function ramp(name: RampName, hue: number, chroma: number, exact?: Hex): Ramp {
  const steps = STEP_LIGHTNESS.map((l) => toHex(inGamut({ l, c: chroma * chromaShare(l), h: hue })))
  if (exact) steps[nearestStep(fromHex(exact).l)] = exact
  return { name, steps }
}

/** Welke stap (als plek in STEPS) het dichtst bij deze lichtheid ligt */
export function nearestStep(l: number): number {
  let best = 0
  for (let i = 1; i < STEP_LIGHTNESS.length; i++) if (Math.abs(STEP_LIGHTNESS[i] - l) < Math.abs(STEP_LIGHTNESS[best] - l)) best = i
  return best
}

/** De kleur op een stap, zoals 500 */
export const at = (r: Ramp, step: (typeof STEPS)[number]) => r.steps[STEPS.indexOf(step)]

/** Een kleur een tikje lichter of donkerder, met tint en chroma zoveel mogelijk vast */
export const shade = (c: Oklch, dl: number): Oklch => ({ ...c, l: clamp(c.l + dl) })

/** Hoe ver twee kleuren uit elkaar liggen */
export const distance = (a: Hex, b: Hex) => deltaEOK(fromHex(a), fromHex(b))
