// Een flesje of een hele plank als link. Compact, base64url, met een versienummer voorop.
// Er is geen backend: alles wat nodig is, zit in de link zelf

import { fromHex, isHex, toHex } from './color.ts'
import type { Bottle, RecipeItem } from './bottle.ts'
import type { Role } from './palette.ts'

export const BOTTLE_VERSION = 1
export const SHELF_VERSION = 1

const ROLES: readonly Role[] = ['achtergrond', 'oppervlak', 'tekst', 'accent', 'signaal']
const EPOCH = Date.UTC(2020, 0, 1)
const DAY = 86_400_000

class Writer {
  bytes: number[] = []
  byte(v: number) {
    this.bytes.push(v & 0xff)
  }
  /** Een geheel getal zo kort als het kan, zeven bits per byte */
  varint(v: number) {
    let n = Math.max(0, Math.floor(v))
    while (n >= 0x80) {
      this.byte((n & 0x7f) | 0x80)
      n = Math.floor(n / 128)
    }
    this.byte(n)
  }
  uint32(v: number) {
    for (let i = 0; i < 4; i++) this.byte((v >>> (8 * i)) & 0xff)
  }
  hex(hex: string) {
    for (let i = 1; i < 7; i += 2) this.byte(parseInt(hex.slice(i, i + 2), 16))
  }
  text(value: string) {
    const encoded = new TextEncoder().encode(value)
    this.varint(encoded.length)
    for (const b of encoded) this.byte(b)
  }
  raw(bytes: Uint8Array) {
    this.varint(bytes.length)
    for (const b of bytes) this.byte(b)
  }
  done() {
    return Uint8Array.from(this.bytes)
  }
}

class Reader {
  at = 0
  bytes: Uint8Array
  constructor(bytes: Uint8Array) {
    this.bytes = bytes
  }
  byte() {
    if (this.at >= this.bytes.length) throw new RangeError('link te kort')
    return this.bytes[this.at++]
  }
  varint() {
    let result = 0
    let scale = 1
    for (let i = 0; i < 6; i++) {
      const b = this.byte()
      result += (b & 0x7f) * scale
      if (b < 0x80) return result
      scale *= 128
    }
    throw new RangeError('getal te lang')
  }
  uint32() {
    let v = 0
    for (let i = 0; i < 4; i++) v += this.byte() * 2 ** (8 * i)
    return v >>> 0
  }
  hex() {
    let out = '#'
    for (let i = 0; i < 3; i++) out += this.byte().toString(16).padStart(2, '0')
    return out
  }
  text() {
    const length = this.varint()
    if (this.at + length > this.bytes.length) throw new RangeError('tekst te lang')
    const slice = this.bytes.subarray(this.at, this.at + length)
    this.at += length
    return new TextDecoder('utf-8', { fatal: true }).decode(slice)
  }
  raw() {
    const length = this.varint()
    if (this.at + length > this.bytes.length) throw new RangeError('stuk te lang')
    const slice = this.bytes.subarray(this.at, this.at + length)
    this.at += length
    return slice
  }
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fromBase64Url(code: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(code)) throw new RangeError('geen base64url')
  const padded = code.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (code.length % 4)) % 4)
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

const daysOf = (date: string) => Math.round((Date.parse(`${date}T00:00:00Z`) - EPOCH) / DAY)
const dateOf = (days: number) => new Date(EPOCH + days * DAY).toISOString().slice(0, 10)

function writeBottle(bottle: Bottle): Uint8Array {
  const w = new Writer()
  w.byte(BOTTLE_VERSION)
  w.byte(bottle.swatches.length)
  for (const s of bottle.swatches) {
    w.hex(s.hex)
    w.byte(ROLES.indexOf(s.role))
  }
  w.text(bottle.name.slice(0, 80))
  w.varint(Math.max(0, daysOf(bottle.date)))
  w.varint(bottle.recipe.stirs)
  w.byte(bottle.recipe.size)
  w.uint32(bottle.recipe.seed)
  w.byte(bottle.recipe.items.length)
  for (const item of bottle.recipe.items) {
    w.byte(item.pigments ? 1 : 0)
    w.text(item.id)
    if (item.pigments) {
      w.byte(item.pigments.length)
      for (const p of item.pigments) {
        w.hex(toHex(p.color))
        w.byte(Math.min(255, Math.max(1, Math.round(p.weight * 10))))
      }
    }
  }
  return w.done()
}

/** Versie 1: zoals hierboven geschreven. Een nieuwe versie krijgt een eigen lezer, en deze blijft staan */
function readBottleV1(r: Reader): Bottle {
  const count = r.byte()
  if (count < 1 || count > 12) throw new RangeError('vreemd aantal kleuren')
  const swatches = Array.from({ length: count }, () => {
    const hex = r.hex()
    const role = ROLES[r.byte()]
    if (!role) throw new RangeError('onbekende rol')
    return { hex, role }
  })
  const name = r.text()
  const date = dateOf(r.varint())
  const stirs = r.varint()
  const size = r.byte()
  const seed = r.uint32()
  const itemCount = r.byte()
  const items: RecipeItem[] = Array.from({ length: itemCount }, () => {
    const photo = r.byte() === 1
    const id = r.text()
    if (!photo) return { id }
    const pigments = Array.from({ length: r.byte() }, () => ({ color: fromHex(r.hex()), weight: r.byte() / 10 }))
    return { id, pigments }
  })
  return { swatches, recipe: { items, stirs, size, seed }, name, date }
}

function readBottle(bytes: Uint8Array): Bottle {
  const r = new Reader(bytes)
  const version = r.byte()
  if (version === 1) return readBottleV1(r)
  throw new RangeError(`onbekende versie ${version}`)
}

export function encodeBottle(bottle: Bottle): string {
  return toBase64Url(writeBottle(bottle))
}

/** Lees een flesje uit een link. Klopt er iets niet, dan null */
export function decodeBottle(code: string): Bottle | null {
  try {
    const bottle = readBottle(fromBase64Url(code))
    return bottle.swatches.every((s) => isHex(s.hex)) ? bottle : null
  } catch {
    return null
  }
}

export function encodeShelf(bottles: readonly Bottle[]): string {
  const w = new Writer()
  w.byte(SHELF_VERSION)
  w.varint(bottles.length)
  for (const b of bottles) w.raw(writeBottle(b))
  return toBase64Url(w.done())
}

export function decodeShelf(code: string): Bottle[] | null {
  try {
    const r = new Reader(fromBase64Url(code))
    const version = r.byte()
    if (version !== 1) return null
    const count = r.varint()
    if (count > 200) return null
    return Array.from({ length: count }, () => readBottle(r.raw()))
  } catch {
    return null
  }
}

export type Route = { kind: 'fles'; code: string } | { kind: 'plank'; code: string } | { kind: 'werkplaats' }

/** Waar het adres naartoe wijst: /fles/<code>, /plank/<code>, of dezelfde twee in de hash */
export function readRoute(pathname: string, hash = ''): Route {
  const match = (pathname.match(/^\/(fles|plank)\/([A-Za-z0-9_-]+)\/?$/) ?? hash.match(/^#\/?(fles|plank)\/([A-Za-z0-9_-]+)$/)) as [string, 'fles' | 'plank', string] | null
  return match ? { kind: match[1], code: match[2] } : { kind: 'werkplaats' }
}
