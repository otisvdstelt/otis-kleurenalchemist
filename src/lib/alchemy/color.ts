// Kleur in OKLab en OKLCH. Hier wordt nooit in RGB gerekend, behalve aan de rand, waar een kleur het scherm op moet

import { converter, formatHex, modeLrgb, modeOklab, modeOklch, modeRgb, parseHex, toGamut, useMode, type Oklch as CuloriOklch } from 'culori/fn'

useMode(modeRgb)
useMode(modeLrgb)
useMode(modeOklab)
useMode(modeOklch)

/** Lichtheid 0 tot 1, chroma 0 tot ongeveer 0,37, tint in graden */
export interface Oklch {
  l: number
  c: number
  h: number
}

export interface Oklab {
  l: number
  a: number
  b: number
}

/** Altijd #rrggbb in kleine letters */
export type Hex = string

const toOklchMode = converter('oklch')
const toOklabMode = converter('oklab')
const toRgbMode = converter('rgb')
/** Het algoritme uit CSS Color 4: hou lichtheid en tint vast, laat de chroma zakken tot de kleur in sRGB past */
const mapToSrgb = toGamut('rgb', 'oklch')

const HEX = /^#[0-9a-f]{6}$/

export const isHex = (value: unknown): value is Hex => typeof value === 'string' && HEX.test(value)

/** Een tint tussen 0 en 360 */
export const wrapHue = (h: number) => ((h % 360) + 360) % 360

export const clamp = (x: number, min = 0, max = 1) => Math.min(max, Math.max(min, x))

const culori = ({ l, c, h }: Oklch): CuloriOklch => ({ mode: 'oklch', l, c, h })

/** In sRGB passend gemaakt, met lichtheid en tint zoveel mogelijk vast */
export function inGamut(color: Oklch): Oklch {
  return fromCulori(toOklchMode(mapToSrgb(culori(color))))
}

/** De hexwaarde van een kleur, eerst in sRGB passend gemaakt */
export function toHex(color: Oklch): Hex {
  return formatHex(mapToSrgb(culori({ l: clamp(color.l), c: Math.max(0, color.c), h: wrapHue(color.h) })))
}

function fromCulori(color: { l?: number; c?: number; h?: number } | undefined): Oklch {
  // Grijs heeft geen tint, die wordt dan 0
  return { l: color?.l ?? 0, c: color?.c ?? 0, h: wrapHue(color?.h ?? 0) }
}

export function fromHex(hex: Hex): Oklch {
  return fromCulori(toOklchMode(parseHex(hex)))
}

export function toOklab({ l, c, h }: Oklch): Oklab {
  const rad = (h * Math.PI) / 180
  return { l, a: c * Math.cos(rad), b: c * Math.sin(rad) }
}

export function fromOklab({ l, a, b }: Oklab): Oklch {
  const c = Math.hypot(a, b)
  return { l, c, h: c < 1e-6 ? 0 : wrapHue((Math.atan2(b, a) * 180) / Math.PI) }
}

export function hexToOklab(hex: Hex): Oklab {
  const lab = toOklabMode(parseHex(hex))
  return { l: lab?.l ?? 0, a: lab?.a ?? 0, b: lab?.b ?? 0 }
}

/** Kleurverschil in OKLab. Onder 0,02 zie je het nauwelijks, onder 0,08 lijken twee kleuren op elkaar */
export function deltaEOK(x: Oklch | Oklab, y: Oklch | Oklab): number {
  const a = 'a' in x ? x : toOklab(x)
  const b = 'a' in y ? y : toOklab(y)
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b)
}

/** sRGB-kanalen van 0 tot 1 */
export function hexToRgb(hex: Hex): [number, number, number] {
  const rgb = toRgbMode(parseHex(hex))
  return [rgb?.r ?? 0, rgb?.g ?? 0, rgb?.b ?? 0]
}

/** sRGB-kanaal (0 tot 1) naar lineair licht */
export const linearize = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)

/** Lineair licht naar sRGB-kanaal (0 tot 1) */
export const delinearize = (v: number) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)

/** Snel van lineair sRGB naar OKLab, voor veel pixels tegelijk (Björn Ottosson, 2020) */
export function linearRgbToOklab(r: number, g: number, b: number): Oklab {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  }
}

/** Van OKLab naar lineair sRGB, zonder te begrenzen */
export function oklabToLinearRgb({ l, a, b }: Oklab): [number, number, number] {
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_, -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_, -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_]
}

/** Een hexwaarde uit lineaire sRGB, begrensd */
export function linearRgbToHex(r: number, g: number, b: number): Hex {
  const byte = (v: number) =>
    Math.round(clamp(delinearize(clamp(v))) * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${byte(r)}${byte(g)}${byte(b)}`
}

/** Het gewogen gemiddelde van tinten op de cirkel, gewogen naar gewicht maal chroma. Grijs telt niet mee */
export function meanHue(colors: readonly { color: Oklch; weight: number }[]): number {
  let x = 0
  let y = 0
  for (const { color, weight } of colors) {
    const rad = (color.h * Math.PI) / 180
    x += Math.cos(rad) * weight * color.c
    y += Math.sin(rad) * weight * color.c
  }
  return Math.hypot(x, y) < 1e-9 ? 0 : wrapHue((Math.atan2(y, x) * 180) / Math.PI)
}

/** Lineair tussen twee kleuren in OKLab */
export function lerpOklab(from: Oklch, to: Oklch, t: number): Oklch {
  const a = toOklab(from)
  const b = toOklab(to)
  return fromOklab({ l: a.l + (b.l - a.l) * t, a: a.a + (b.a - a.a) * t, b: a.b + (b.b - a.b) * t })
}

/** Draai een tint de korte kant op naar een andere, met t van 0 tot 1 */
export function lerpHue(from: number, to: number, t: number): number {
  const d = ((to - from + 540) % 360) - 180
  return wrapHue(from + d * t)
}
