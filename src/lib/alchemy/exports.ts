// Het palet mee naar je eigen werk: CSS, een Tailwind-thema of JSON. De PNG van het flesje tekent de papieren laag

import { fromHex, hexToRgb } from './color.ts'
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

/** Tekens die in XML iets betekenen, onschadelijk gemaakt */
const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Een SVG met een staal per kleur, met de naam van de rol en de hexwaarde eronder */
export function toSvg(bottle: Bottle): string {
  const size = 120
  const gap = 16
  const n = bottle.swatches.length
  const width = n * size + (n - 1) * gap + 48
  const rows = bottle.swatches
    .map((s, i) => {
      const x = 24 + i * (size + gap)
      return [
        `  <rect x="${x}" y="64" width="${size}" height="${size}" rx="10" fill="${s.hex}" stroke="#2c2823" stroke-opacity="0.2"/>`,
        `  <text x="${x}" y="${64 + size + 26}" font-size="15">${xml(tokenName(bottle.swatches, i))}</text>`,
        `  <text x="${x}" y="${64 + size + 46}" font-size="14" fill="#5e554a">${s.hex}</text>`,
      ].join('\n')
    })
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${64 + size + 72}" viewBox="0 0 ${width} ${64 + size + 72}" font-family="system-ui, sans-serif" fill="#2c2823">
  <title>${xml(bottle.name)}</title>
  <rect width="100%" height="100%" fill="#f7f4eb"/>
  <text x="24" y="40" font-size="22">${xml(bottle.name)}</text>
${rows}
</svg>
`
}

/**
 * Design tokens in het formaat van de W3C Design Tokens Community Group.
 * Figma leest ze in als variabelen via een import-plugin, net als Tokens Studio en Style Dictionary
 */
export function toDesignTokens(bottle: Bottle): string {
  const colours: Record<string, { $type: 'color'; $value: string; $description: string }> = {}
  bottle.swatches.forEach((s, i) => {
    colours[tokenName(bottle.swatches, i)] = { $type: 'color', $value: s.hex, $description: s.role }
  })
  return `${JSON.stringify({ $description: `${bottle.name} · Kleurenalchemist`, kleur: colours }, null, 2)}\n`
}

/**
 * Adobe Swatch Exchange (.ase), versie 1.0: een groep met het palet erin, elke kleur in RGB.
 * Leest in Illustrator, Photoshop, InDesign, Procreate en Affinity
 */
export function toAse(bottle: Bottle): Uint8Array {
  const bytes: number[] = []
  const u16 = (v: number) => bytes.push((v >> 8) & 0xff, v & 0xff)
  const u32 = (v: number) => bytes.push((v >>> 24) & 0xff, (v >>> 16) & 0xff, (v >>> 8) & 0xff, v & 0xff)
  const f32 = (v: number) => {
    const view = new DataView(new ArrayBuffer(4))
    view.setFloat32(0, v)
    for (let i = 0; i < 4; i++) bytes.push(view.getUint8(i))
  }
  /** Een naam als UTF-16 met een nul erachter, voorafgegaan door het aantal tekens */
  const name = (text: string) => {
    const units = [...text].flatMap((ch) => {
      const code = ch.codePointAt(0)!
      return code > 0xffff ? [0xd800 + ((code - 0x10000) >> 10), 0xdc00 + ((code - 0x10000) & 0x3ff)] : [code]
    })
    const block: number[] = []
    block.push(((units.length + 1) >> 8) & 0xff, (units.length + 1) & 0xff)
    for (const u of units) block.push((u >> 8) & 0xff, u & 0xff)
    block.push(0, 0)
    return block
  }
  const block = (type: number, body: number[]) => {
    u16(type)
    u32(body.length)
    bytes.push(...body)
  }
  bytes.push(0x41, 0x53, 0x45, 0x46) // ASEF
  u16(1)
  u16(0)
  u32(bottle.swatches.length + 2)
  block(0xc001, name(bottle.name))
  bottle.swatches.forEach((s, i) => {
    const body = name(tokenName(bottle.swatches, i))
    body.push(0x52, 0x47, 0x42, 0x20) // 'RGB '
    const start = bytes.length
    for (const v of hexToRgb(s.hex)) f32(v)
    u16(2) // normaal, geen steunkleur
    body.push(...bytes.splice(start))
    block(0x0001, body)
  })
  block(0xc002, [])
  return Uint8Array.from(bytes)
}
