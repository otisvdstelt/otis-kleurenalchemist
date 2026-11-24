// Grafiekkleuren die je uit elkaar houdt, ook als je kleuren anders ziet

import { hexToOklab, inGamut, toHex, wrapHue, type Hex, type Oklch, deltaEOK } from './color.ts'
import { contrastRatio, THRESHOLDS } from './contrast.ts'
import { simulate, type Vision } from './cvd.ts'

/** Hoe ver twee kleuren uit elkaar liggen, gewoon en door de monocle. Telt de kleinste */
function apart(a: Hex, b: Hex, visions: readonly Vision[]): number {
  let d = deltaEOK(hexToOklab(a), hexToOklab(b))
  for (const v of visions) d = Math.min(d, deltaEOK(hexToOklab(simulate(a, v)), hexToOklab(simulate(b, v))))
  return d
}

/**
 * Kies `count` grafiekkleuren, te beginnen bij de hoofdkleur. Elke volgende is de kandidaat die het verst ligt
 * van wat er al gekozen is, gewoon én bij deuteranopie en protanopie. Alle kandidaten halen 3:1 tegen de achtergrond
 */
export function chartColours(main: Oklch, background: Hex, count = 6, visions: readonly Vision[] = ['deuteranopie', 'protanopie']): Hex[] {
  const first = toHex(inGamut(main))
  const candidates: Hex[] = []
  for (let k = 0; k < 24; k++) {
    for (const l of [0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8]) {
      const hex = toHex(inGamut({ l, c: Math.max(0.1, main.c), h: wrapHue(main.h + k * 15) }))
      if (contrastRatio(hex, background) >= THRESHOLDS.large + 0.1) candidates.push(hex)
    }
  }
  const chosen = [first]
  while (chosen.length < count && candidates.length > 0) {
    let best = candidates[0]
    let bestScore = -1
    for (const c of candidates) {
      const score = Math.min(...chosen.map((x) => apart(x, c, visions)))
      if (score > bestScore) {
        bestScore = score
        best = c
      }
    }
    chosen.push(best)
    candidates.splice(candidates.indexOf(best), 1)
  }
  return chosen
}

/** De kleinste afstand tussen twee kleuren in de rij, door de monocle. Voor tests en voor de check */
export function smallestGap(colours: readonly Hex[], vision: Vision): number {
  let min = Infinity
  for (let i = 0; i < colours.length; i++) for (let j = i + 1; j < colours.length; j++) min = Math.min(min, deltaEOK(hexToOklab(simulate(colours[i], vision)), hexToOklab(simulate(colours[j], vision))))
  return min
}
