// Een PNG van het flesje met zijn etiket, getekend op een canvas met dezelfde handschriften als de pagina

import type { Bottle } from '../../lib/alchemy/bottle'
import { luminance } from '../../lib/alchemy/contrast'
import { tokenName } from '../../lib/alchemy/exports'
import { FLES_BODY, FLES_CORK, FLES_FILL } from './flesVorm'

const W = 900
const H = 1200
const PAPER = '#f7f4eb'
const INK = '#2c2823'
const SOFT = '#5e554a'

/** Een korte, veilige bestandsnaam uit de naam van het flesje */
export const fileName = (bottle: Bottle, extension: string) =>
  `${
    bottle.name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'flesje'
  }.${extension}`

/** Wacht tot de handschriften er zijn, maar niet eindeloos */
async function fonts() {
  try {
    await Promise.race([Promise.all(['64px Yomogi', '40px "Zen Antique Soft"', '28px "Klee One"', '48px "Homemade Apple"'].map((f) => document.fonts.load(f))), new Promise((r) => setTimeout(r, 1500))])
  } catch {
    // Dan maar in de vervangletter
  }
}

/** Teken het flesje en geef het als PNG terug */
export async function bottlePng(bottle: Bottle): Promise<Blob> {
  await fonts()
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  if (!c) throw new Error('geen canvas')

  // Het vel, met wat tand erin
  c.fillStyle = PAPER
  c.fillRect(0, 0, W, H)
  for (let i = 0; i < 9000; i++) {
    c.fillStyle = `rgba(44, 40, 35, ${Math.random() * 0.05})`
    c.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4)
  }

  // Het flesje, groot in het midden, met de lagen erin: de zwaarste onderop
  const scale = 3.2
  c.save()
  c.translate(W / 2 - 60 * scale, 70)
  c.scale(scale, scale)
  const body = new Path2D(FLES_BODY)
  c.save()
  c.clip(body)
  c.fillStyle = 'rgba(252, 250, 243, 0.5)'
  c.fill(body)
  const layers = [...bottle.swatches].sort((a, b) => luminance(a.hex) - luminance(b.hex))
  const h = (FLES_FILL.bottom - FLES_FILL.top) / layers.length
  layers.forEach((s, i) => {
    c.fillStyle = s.hex
    c.fillRect(0, FLES_FILL.bottom - (i + 1) * h - 0.3, 120, h + 0.6)
  })
  c.strokeStyle = 'rgba(252, 250, 243, 0.55)'
  c.lineWidth = 4
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(29, 82)
  c.quadraticCurveTo(26, 140, 30, 190)
  c.stroke()
  c.restore()
  c.strokeStyle = INK
  c.lineWidth = 2.6
  c.lineJoin = 'round'
  c.stroke(body)
  c.fillStyle = '#b07a4a'
  const cork = new Path2D(FLES_CORK)
  c.fill(cork)
  c.stroke(cork)
  c.restore()

  // Het etiket, scheef geplakt
  c.save()
  c.translate(W / 2, 760)
  c.rotate(-0.05)
  c.font = '54px Yomogi, cursive'
  const nameWidth = Math.min(700, c.measureText(bottle.name).width)
  const lw = nameWidth + 90
  c.fillStyle = '#fcfaf3'
  c.shadowColor = 'rgba(58, 42, 32, 0.28)'
  c.shadowBlur = 18
  c.shadowOffsetY = 6
  c.fillRect(-lw / 2, -62, lw, 128)
  c.shadowColor = 'transparent'
  c.fillStyle = INK
  c.textAlign = 'center'
  c.fillText(bottle.name, 0, 6, 700)
  c.font = '30px Yomogi, cursive'
  c.fillStyle = SOFT
  c.fillText(new Date(`${bottle.date}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }), 0, 48)
  c.restore()

  // De kleuren op een rij, met rol en hexwaarde
  const n = bottle.swatches.length
  const gap = 18
  const size = Math.min(104, (W - 120 - gap * (n - 1)) / n)
  const start = (W - (size * n + gap * (n - 1))) / 2
  bottle.swatches.forEach((s, i) => {
    const x = start + i * (size + gap)
    c.fillStyle = s.hex
    c.beginPath()
    c.ellipse(x + size / 2, 935, size / 2, size / 2.1, 0.2 * (i % 2 ? 1 : -1), 0, Math.PI * 2)
    c.fill()
    c.strokeStyle = 'rgba(44, 40, 35, 0.3)'
    c.lineWidth = 2
    c.stroke()
    c.fillStyle = INK
    c.textAlign = 'center'
    c.font = '24px Yomogi, cursive'
    c.fillText(tokenName(bottle.swatches, i), x + size / 2, 1025)
    c.font = '22px "Klee One", sans-serif'
    c.fillStyle = SOFT
    c.fillText(s.hex, x + size / 2, 1058)
  })

  c.textAlign = 'center'
  c.font = '30px "Zen Antique Soft", serif'
  c.fillStyle = SOFT
  c.fillText('Kleurenalchemist', W / 2, 1150)

  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('geen png'))), 'image/png'))
}

/** Bied een bestand aan om op te slaan */
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
