// Wat er in de potjes zit. De lijst staat in public/data/ingredients.json, dit bestand zegt hoe hij eruit hoort te zien

import { isHex, type Hex, type Oklch } from './color'

export interface Pigment {
  color: Oklch
  /** Hoeveel ervan in het potje zit, ten opzichte van de andere pigmenten */
  weight: number
}

export type JarShape = 'bol' | 'slank' | 'buik' | 'kolf' | 'pot'

export interface Jar {
  shape: JarShape
  /** Hoogte ten opzichte van een gewoon potje, ongeveer 0,7 tot 1,4 */
  height: number
  cork: Hex
}

export interface Character {
  warmth?: 'warm' | 'koel'
  strength?: 'dof' | 'fel'
}

/** Wat een speciaal ingrediënt met het palet doet in plaats van kleur toe te voegen */
export type Effect = 'contrast' | 'water' | 'houtskool'

export interface Ingredient {
  id: string
  /** Kort, met een kleine letter, zoals het op de plank staat */
  name: string
  /** Een korte zin op het etiket */
  label: string
  /** Leeg bij een speciaal ingrediënt */
  pigments: Pigment[]
  jar: Jar
  character?: Character
  effect?: Effect
}

export const isSpecial = (ingredient: Ingredient) => ingredient.effect !== undefined

// Hoe het in de JSON staat, met Nederlandse sleutels
interface RawPigment {
  oklch: [number, number, number]
  gewicht: number
}

interface RawIngredient {
  id: string
  naam: string
  etiket: string
  pigmenten?: RawPigment[]
  potje: { vorm: JarShape; hoogte: number; kurk: string }
  karakter?: { temperatuur?: 'warm' | 'koel'; felheid?: 'dof' | 'fel' }
  effect?: Effect
}

const SHAPES: readonly JarShape[] = ['bol', 'slank', 'buik', 'kolf', 'pot']
const EFFECTS: readonly Effect[] = ['contrast', 'water', 'houtskool']
const ID = /^[a-z0-9-]{1,24}$/

export class BadIngredients extends Error {}

const fail = (why: string): never => {
  throw new BadIngredients(why)
}

const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)

function parsePigment(raw: unknown, where: string): Pigment {
  const p = raw as RawPigment
  if (!Array.isArray(p?.oklch) || p.oklch.length !== 3 || !p.oklch.every(isNumber)) fail(`${where}: oklch moet [l, c, h] zijn`)
  const [l, c, h] = p.oklch
  if (l < 0 || l > 1 || c < 0 || c > 0.5 || h < 0 || h >= 360) fail(`${where}: oklch buiten bereik`)
  if (!isNumber(p.gewicht) || p.gewicht <= 0) fail(`${where}: gewicht moet groter dan nul zijn`)
  return { color: { l, c, h }, weight: p.gewicht }
}

/** Lees de lijst uit de JSON, en weiger hem hardop als er iets niet klopt */
export function parseIngredients(data: unknown): Ingredient[] {
  if (!Array.isArray(data)) fail('de lijst met ingrediënten is geen lijst')
  const seen = new Set<string>()
  return (data as RawIngredient[]).map((raw, index) => {
    const where = `ingrediënt ${raw?.id ?? index}`
    if (typeof raw?.id !== 'string' || !ID.test(raw.id)) fail(`${where}: ongeldige id`)
    if (seen.has(raw.id)) fail(`${where}: dubbele id`)
    seen.add(raw.id)
    if (typeof raw.naam !== 'string' || !raw.naam) fail(`${where}: naam ontbreekt`)
    if (typeof raw.etiket !== 'string' || !raw.etiket) fail(`${where}: etiket ontbreekt`)
    if (raw.effect !== undefined && !EFFECTS.includes(raw.effect)) fail(`${where}: onbekend effect`)
    const pigments = (raw.pigmenten ?? []).map((p, i) => parsePigment(p, `${where}, pigment ${i + 1}`))
    if (raw.effect === undefined && (pigments.length < 2 || pigments.length > 4)) fail(`${where}: een kleur heeft 2 tot 4 pigmenten`)
    if (raw.effect !== undefined && pigments.length > 0) fail(`${where}: een speciaal ingrediënt heeft geen pigmenten`)
    const jar = raw.potje
    if (!SHAPES.includes(jar?.vorm)) fail(`${where}: onbekende vorm van het potje`)
    if (!isNumber(jar.hoogte) || jar.hoogte < 0.5 || jar.hoogte > 1.6) fail(`${where}: hoogte van het potje buiten bereik`)
    if (!isHex(jar.kurk)) fail(`${where}: kurk moet een hexwaarde zijn`)
    const character: Character | undefined = raw.karakter ? { warmth: raw.karakter.temperatuur, strength: raw.karakter.felheid } : undefined
    return {
      id: raw.id,
      name: raw.naam,
      label: raw.etiket,
      pigments,
      jar: { shape: jar.vorm, height: jar.hoogte, cork: jar.kurk },
      ...(character ? { character } : {}),
      ...(raw.effect ? { effect: raw.effect } : {}),
    }
  })
}

/** Een foto wordt een ingrediënt zoals elk ander, met de kleuren die eruit gehaald zijn */
export function photoIngredient(id: string, pigments: Pigment[], words: { name: string; label: string }): Ingredient {
  return {
    id,
    name: words.name,
    label: words.label,
    pigments,
    jar: { shape: 'pot', height: 0.9, cork: '#c9b48a' },
  }
}
