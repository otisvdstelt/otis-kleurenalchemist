// Wat er in de potjes zit. De lijst staat in public/data/ingredients.json, dit bestand zegt hoe hij eruit hoort te zien

import { isHex, toHex, type Hex, type Oklch } from './color.ts'

export interface Pigment {
  color: Oklch
  /** Hoeveel ervan in het potje zit, ten opzichte van de andere pigmenten */
  weight: number
}

export type JarShape = 'bol' | 'slank' | 'buik' | 'kolf' | 'pot' | 'blik' | 'zakje'

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

/** Wat een bewerking met het palet doet */
export type Effect = 'contrast' | 'water' | 'houtskool'

/** Vier soorten potjes. De basis is geen potje uit de kast maar je eigen kleur, en staat apart in de ketel */
export type Kind = 'doel' | 'smaak' | 'harmonie' | 'bewerking'

/** Waar het palet voor is */
export type GoalId = 'website' | 'donker' | 'affiche' | 'huisstijl' | 'presentatie'
export const GOAL_IDS: readonly GoalId[] = ['website', 'donker', 'affiche', 'huisstijl', 'presentatie']

/** Hoe de accenten tegenover de hoofdkleur staan */
export type HarmonyId = 'complementair' | 'analoog' | 'drieklank' | 'gesplitst' | 'een-tint'
export const HARMONY_IDS: readonly HarmonyId[] = ['complementair', 'analoog', 'drieklank', 'gesplitst', 'een-tint']

/** Wat een smaak met het palet doet. Elk getal van -1 tot 1 */
export interface Taste {
  /** Positief warmer (de tint richting oranje), negatief koeler (richting blauw) */
  warmte: number
  /** Lichter of donkerder */
  licht: number
  /** Feller of zachter */
  chroma: number
  /** Meer of minder verschil tussen licht en donker */
  contrast: number
}

export interface Ingredient {
  id: string
  kind: Kind
  /** Kort, met een kleine letter, zoals het op de plank staat */
  name: string
  /** Een paar woorden op het etiket: wat het potje doet */
  label: string
  /** De kleuren achter het glas. Alleen voor het oog: een smaak stuurt, hij gooit zijn kleuren niet in de ketel */
  pigments: Pigment[]
  jar: Jar
  character?: Character
  /** Bij een smaak: de tint die hij voorstelt als er geen basis is */
  tint?: number
  /** Bij een smaak: wat hij doet */
  taste?: Taste
  goal?: GoalId
  harmony?: HarmonyId
  effect?: Effect
}

/** Een bewerking (contrast, water, houtskool) werkt op het palet dat er al is */
export const isSpecial = (ingredient: Ingredient) => ingredient.kind === 'bewerking'
export const isTaste = (ingredient: Ingredient) => ingredient.kind === 'smaak'

/** De naam zonder zachte afbreekstreepjes, voor in een zin, een flesnaam of een etiket in 3D */
export const plainName = (ingredient: Ingredient) => ingredient.name.replace(/\u00ad/g, '')

// Hoe het in de JSON staat, met Nederlandse sleutels
interface RawPigment {
  oklch: [number, number, number]
  gewicht: number
}

interface RawIngredient {
  id: string
  soort: Kind
  naam: string
  etiket: string
  pigmenten?: RawPigment[]
  potje: { vorm: JarShape; hoogte: number; kurk: string }
  karakter?: { temperatuur?: 'warm' | 'koel'; felheid?: 'dof' | 'fel' }
  tint?: number
  smaak?: Partial<Taste>
  effect?: Effect
}

const KINDS: readonly Kind[] = ['doel', 'smaak', 'harmonie', 'bewerking']
const SHAPES: readonly JarShape[] = ['bol', 'slank', 'buik', 'kolf', 'pot', 'blik', 'zakje']
const EFFECTS: readonly Effect[] = ['contrast', 'water', 'houtskool']
const ID = /^[a-z0-9-]{1,24}$/

export class BadIngredients extends Error {}

const fail = (why: string): never => {
  throw new BadIngredients(why)
}

const isNumber = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const clampTaste = (x: unknown) => (isNumber(x) ? Math.max(-1, Math.min(1, x)) : 0)

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
    if (!KINDS.includes(raw.soort)) fail(`${where}: onbekende soort`)
    if (raw.soort === 'bewerking' && !EFFECTS.includes(raw.effect as Effect)) fail(`${where}: onbekend effect`)
    if (raw.soort === 'doel' && !GOAL_IDS.includes(raw.id as GoalId)) fail(`${where}: onbekend doel`)
    if (raw.soort === 'harmonie' && !HARMONY_IDS.includes(raw.id as HarmonyId)) fail(`${where}: onbekende harmonie`)
    const pigments = (raw.pigmenten ?? []).map((p, i) => parsePigment(p, `${where}, pigment ${i + 1}`))
    if (raw.soort === 'smaak' && (pigments.length < 2 || pigments.length > 4)) fail(`${where}: een smaak heeft 2 tot 4 pigmenten`)
    if (raw.soort === 'smaak' && (!isNumber(raw.tint) || raw.tint < 0 || raw.tint >= 360)) fail(`${where}: een smaak heeft een tint van 0 tot 360`)
    const taste: Taste | undefined =
      raw.soort === 'smaak'
        ? {
            warmte: clampTaste(raw.smaak?.warmte),
            licht: clampTaste(raw.smaak?.licht),
            chroma: clampTaste(raw.smaak?.chroma),
            contrast: clampTaste(raw.smaak?.contrast),
          }
        : undefined
    const jar = raw.potje
    if (!SHAPES.includes(jar?.vorm)) fail(`${where}: onbekende vorm van het potje`)
    if (!isNumber(jar.hoogte) || jar.hoogte < 0.5 || jar.hoogte > 1.6) fail(`${where}: hoogte van het potje buiten bereik`)
    if (!isHex(jar.kurk)) fail(`${where}: kurk moet een hexwaarde zijn`)
    const character: Character | undefined = raw.karakter ? { warmth: raw.karakter.temperatuur, strength: raw.karakter.felheid } : undefined
    return {
      id: raw.id,
      kind: raw.soort,
      name: raw.naam,
      label: raw.etiket,
      pigments,
      jar: { shape: jar.vorm, height: jar.hoogte, cork: jar.kurk },
      ...(character ? { character } : {}),
      ...(taste ? { taste, tint: raw.tint } : {}),
      ...(raw.soort === 'doel' ? { goal: raw.id as GoalId } : {}),
      ...(raw.soort === 'harmonie' ? { harmony: raw.id as HarmonyId } : {}),
      ...(raw.soort === 'bewerking' ? { effect: raw.effect } : {}),
    }
  })
}

/** Een foto wordt een ingrediënt zoals elk ander, met de kleuren die eruit gehaald zijn */
export function photoIngredient(id: string, pigments: Pigment[], words: { name: string; label: string }): Ingredient {
  return {
    id,
    kind: 'smaak',
    name: words.name,
    label: words.label,
    pigments,
    jar: { shape: 'pot', height: 0.9, cork: '#c9b48a' },
    // Een foto uit een oude link stuurt naar zijn zwaarste kleur, verder zonder smaak
    tint: [...pigments].sort((a, b) => b.weight - a.weight)[0]?.color.h ?? 0,
    taste: { warmte: 0, licht: 0, chroma: 0, contrast: 0 },
  }
}

/** De lagen in het potje, van onder naar boven: elk pigment als hexwaarde, met zijn aandeel van 0 tot 1 */
export function jarLayers(ingredient: Ingredient): { hex: Hex; share: number }[] {
  const total = ingredient.pigments.reduce((sum, p) => sum + p.weight, 0)
  return [...ingredient.pigments].sort((a, b) => a.color.l - b.color.l).map((p) => ({ hex: toHex(p.color), share: p.weight / total }))
}
