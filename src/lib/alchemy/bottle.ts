// Een flesje: de uitkomst, en het recept om verder te brouwen

import { fromHex, toHex } from './color.ts'
import { isSpecial, photoIngredient, type Ingredient, type Pigment } from './ingredients.ts'
import type { Brew } from './mix.ts'
import type { Swatch } from './palette.ts'

/** Een potje uit de kast heeft genoeg aan zijn id. Een foto neemt zijn pigmenten mee */
export interface RecipeItem {
  id: string
  pigments?: Pigment[]
}

export interface Recipe {
  items: RecipeItem[]
  stirs: number
  size: number
  seed: number
}

export interface Bottle {
  /** De hexwaarden zelf, zodat een gedeeld flesje er hetzelfde uit blijft zien, ook als het mengen later verandert */
  swatches: Swatch[]
  recipe: Recipe
  name: string
  /** Als JJJJ-MM-DD */
  date: string
}

export const today = (now = new Date()) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

export const isPhoto = (id: string) => id.startsWith('foto')

/** Een pigment zoals het in een link past: de hexwaarde, en het gewicht op een tiende */
function compactPigment(p: Pigment): Pigment {
  return { color: fromHex(toHex(p.color)), weight: Math.min(25.5, Math.max(0.1, Math.round(p.weight * 10) / 10)) }
}

/** Vul een flesje met wat er nu in de ketel zit */
export function bottle(brew: Brew, ingredients: readonly Ingredient[], stirs: number, size: number, name: string, date = today()): Bottle {
  return {
    swatches: brew.swatches.map((s) => ({ ...s })),
    recipe: {
      items: ingredients.map((i) => (isPhoto(i.id) && !isSpecial(i) ? { id: i.id, pigments: i.pigments.map(compactPigment) } : { id: i.id })),
      stirs,
      size,
      seed: brew.seed,
    },
    name,
    date,
  }
}

/** Zet een recept terug om naar ingrediënten. Wat de kast niet (meer) kent, valt weg */
export function ingredientsOf(recipe: Recipe, shelf: readonly Ingredient[], photo: { name: string; label: string }): Ingredient[] {
  return recipe.items.flatMap((item) => {
    if (item.pigments) return [photoIngredient(item.id, item.pigments, photo)]
    const found = shelf.find((i) => i.id === item.id)
    return found ? [found] : []
  })
}
