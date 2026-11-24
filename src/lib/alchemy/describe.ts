// Een kleur en een recept in gewone woorden. De woorden zelf staan in src/content/strings.ts

import { fromHex, type Hex } from './color.ts'
import type { GoalId, HarmonyId, Taste } from './ingredients.ts'

export type HueWord = 'rood' | 'oranje' | 'geel' | 'groen' | 'blauwgroen' | 'blauw' | 'paars' | 'roze' | 'bruin' | 'grijs' | 'zwart' | 'wit'

/** Hoe je deze kleur in één woord zou noemen */
export function hueWord(hex: Hex): HueWord {
  const { l, c, h } = fromHex(hex)
  if (l > 0.95 && c < 0.03) return 'wit'
  if (l < 0.22) return 'zwart'
  if (c < 0.035) return 'grijs'
  if (h >= 30 && h < 80 && l < 0.6) return 'bruin'
  if (h < 20 || h >= 345) return l > 0.75 ? 'roze' : 'rood'
  if (h < 60) return 'oranje'
  if (h < 115) return 'geel'
  if (h < 170) return 'groen'
  if (h < 215) return 'blauwgroen'
  if (h < 280) return 'blauw'
  if (h < 320) return 'paars'
  return 'roze'
}

export interface SentenceWords {
  hues: Readonly<Record<HueWord, string>>
  yours: (hue: string) => string
  goals: Readonly<Record<GoalId, string>>
  harmonies: Readonly<Record<HarmonyId, string>>
  /** Woorden voor wat de smaken doen */
  taste: { warm: string; koel: string; licht: string; diep: string; fel: string; zacht: string; strak: string; fris: string }
  and: string
}

/** Wat de smaken samen doen, in een paar woorden */
export function tasteWords(taste: Taste, words: SentenceWords['taste']): string[] {
  const out: string[] = []
  if (taste.licht > 0.06) out.push(taste.warmte < -0.15 ? words.fris : words.licht)
  if (taste.licht < -0.06) out.push(words.diep)
  if (taste.warmte > 0.15) out.push(words.warm)
  if (taste.warmte < -0.15) out.push(words.koel)
  if (taste.chroma > 0.15) out.push(words.fel)
  if (taste.chroma < -0.15) out.push(words.zacht)
  if (taste.contrast > 0.25) out.push(words.strak)
  return out.slice(0, 3)
}

/**
 * Het recept in één zin: "Jouw groen, voor een website, fris en koel, analoog".
 * `lead` is de hoofdkleur als je een basis gaf, of anders de namen van de smaken
 */
export function recipeSentence(input: { bases: readonly Hex[]; tasteNames: readonly string[]; goal: GoalId; taste: Taste; harmony: HarmonyId | null }, words: SentenceWords): string {
  const list = (items: readonly string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} ${words.and} ${items.at(-1)}`)
  const lead = input.bases[0] ? words.yours(words.hues[hueWord(input.bases[0])]) : list(input.tasteNames)
  const parts = [lead, words.goals[input.goal], list(tasteWords(input.taste, words.taste)), input.harmony ? words.harmonies[input.harmony] : ''].filter(Boolean)
  const sentence = parts.join(', ')
  return sentence.charAt(0).toUpperCase() + sentence.slice(1)
}
