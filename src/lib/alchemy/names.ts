// Een naam voor het flesje, zoals iemand hem met de hand op het etiket zou schrijven. "Mos na regen"
// De woorden zelf staan in src/content/strings.ts. Hier staat alleen hoe ze gekozen worden

import { fromHex } from './color.ts'
import { isSpecial, plainName, type Ingredient } from './ingredients.ts'
import type { Brew } from './mix.ts'
import { mulberry32, pick } from './prng.ts'

export type Mood = 'donker' | 'licht' | 'warm' | 'koel' | 'dof' | 'fel' | 'glad' | 'streperig'

export interface NameWords {
  /** Het eerlijke etiket voor modder */
  mud: string
  /** Hoe een foto heet als hij de hoofdrol heeft */
  photo: string
  /** Tussen twee ingrediënten, zoals "met" in "mos met koper" */
  joiners: readonly string[]
  /** Een staartje per stemming, zoals "na regen" */
  tails: Readonly<Record<Mood, readonly string[]>>
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Waar het palet het meest naar neigt */
export function moodOf(brew: Brew): Mood[] {
  // Het palet van de menging zelf: water, houtskool en een snuifje veranderen de naam niet
  const accents = brew.base.filter((s) => s.role === 'accent' || s.role === 'signaal').map((s) => fromHex(s.hex))
  const all = accents.length ? accents : brew.base.map((s) => fromHex(s.hex))
  const chroma = all.reduce((sum, c) => sum + c.c, 0) / all.length
  const light = all.reduce((sum, c) => sum + c.l, 0) / all.length
  const warmish = all.filter((c) => c.c > 0.03 && (c.h < 100 || c.h > 330)).length
  const coolish = all.filter((c) => c.c > 0.03 && c.h > 150 && c.h < 300).length
  const moods: Mood[] = []
  if (brew.dark) moods.push('donker')
  else if (light > 0.68) moods.push('licht')
  if (chroma > 0.13) moods.push('fel')
  else if (chroma < 0.06) moods.push('dof')
  if (warmish > coolish) moods.push('warm')
  else if (coolish > warmish) moods.push('koel')
  moods.push(brew.homogeneity > 0.75 ? 'glad' : brew.homogeneity < 0.2 ? 'streperig' : 'licht')
  return moods
}

/** Geef het flesje een naam. Hetzelfde brouwsel geeft altijd dezelfde naam */
export function nameBrew(brew: Brew, ingredients: readonly Ingredient[], words: NameWords): string {
  if (brew.mud) return words.mud
  const random = mulberry32(brew.seed ^ 0x9e3779b9)
  const colours = ingredients.filter((i) => !isSpecial(i))
  // Het potje dat het vaakst in de ketel ging, en bij gelijkspel het eerste
  const counts = new Map<string, { ingredient: Ingredient; count: number; first: number }>()
  colours.forEach((ingredient, index) => {
    const entry = counts.get(ingredient.id)
    if (entry) entry.count++
    else counts.set(ingredient.id, { ingredient, count: 1, first: index })
  })
  const ranked = [...counts.values()].sort((a, b) => b.count - a.count || a.first - b.first)
  const noun = (i: Ingredient) => (i.id.startsWith('foto') ? words.photo : plainName(i))
  const main = noun(ranked[0].ingredient)
  const moods = moodOf(brew)
  const mood = moods[pick(random, moods.length)]
  const tails = words.tails[mood]
  const tail = tails[pick(random, tails.length)]
  if (ranked.length >= 2 && random() < 0.4) {
    const joiner = words.joiners[pick(random, words.joiners.length)]
    return capital(`${main} ${joiner} ${noun(ranked[1].ingredient)}`)
  }
  return capital(`${main} ${tail}`)
}
