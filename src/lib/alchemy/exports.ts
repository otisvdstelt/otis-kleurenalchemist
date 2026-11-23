// Het palet mee naar je eigen werk: CSS, een Tailwind-thema of JSON. De PNG van het flesje tekent de papieren laag

import { fromHex } from './color.ts'
import type { Bottle } from './bottle.ts'
import { roleNumber, type Swatch } from './palette.ts'

/** De naam van een kleur in code: achtergrond, accent, accent-2 */
export function tokenName(swatches: readonly Swatch[], index: number): string {
  const n = roleNumber(swatches, index)
  return n > 1 ? `${swatches[index].role}-${n}` : swatches[index].role
}

/** Een kleur als CSS oklch(), op drie decimalen */
export function cssOklch(hex: string): string {
  const { l, c, h } = fromHex(hex)
  const round = (x: number, d: number) => Number(x.toFixed(d))
  return `oklch(${round(l * 100, 1)}% ${round(c, 3)} ${c < 0.002 ? 0 : round(h, 1)})`
}

/** Haal tekens weg die een CSS-commentaar zouden breken */
const safeComment = (text: string) => text.replace(/\*\//g, '* /').replace(/[\r\n]+/g, ' ')

/** CSS custom properties op :root */
export function toCss(bottle: Bottle): string {
  const lines = bottle.swatches.map((s, i) => `  --kleur-${tokenName(bottle.swatches, i)}: ${s.hex};`)
  return `/* ${safeComment(bottle.name)} · ${bottle.date} · Kleurenalchemist */\n:root {\n${lines.join('\n')}\n}\n`
}

/** Een @theme-blok voor Tailwind CSS v4. Daarna werken bg-achtergrond, text-tekst, border-accent enzovoort */
export function toTailwind(bottle: Bottle): string {
  const lines = bottle.swatches.map((s, i) => `  --color-${tokenName(bottle.swatches, i)}: ${s.hex};`)
  return `/* ${safeComment(bottle.name)} · ${bottle.date} · Kleurenalchemist */\n@theme {\n${lines.join('\n')}\n}\n`
}

export function toJson(bottle: Bottle): string {
  return `${JSON.stringify(
    {
      naam: bottle.name,
      datum: bottle.date,
      kleuren: bottle.swatches.map((s, i) => ({ rol: s.role, token: tokenName(bottle.swatches, i), hex: s.hex, oklch: cssOklch(s.hex) })),
      recept: {
        ingredienten: bottle.recipe.items.map((item) => item.id),
        roerslagen: bottle.recipe.stirs,
        seed: bottle.recipe.seed,
      },
    },
    null,
    2,
  )}\n`
}
