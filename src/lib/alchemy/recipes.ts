// Het receptenboek: kant-en-klare recepten in public/data/recipes.json. Een bladzijde openen zet ze in de ketel

import { GOAL_IDS, HARMONY_IDS, type GoalId, type HarmonyId } from './ingredients.ts'
import { isHex, type Hex } from './color.ts'

export interface BookRecipe {
  id: string
  name: string
  /** Eén zin over wat het is */
  note: string
  goal: GoalId
  tastes: string[]
  harmony: HarmonyId | null
  bases: Hex[]
  stirs: number
}

interface RawRecipe {
  id: string
  naam: string
  uitleg: string
  doel: GoalId
  smaken: string[]
  harmonie?: HarmonyId
  basis?: string[]
  roerslagen?: number
}

export class BadRecipes extends Error {}

/** Lees het receptenboek, en weiger het hardop als er iets niet klopt */
export function parseRecipes(data: unknown, knownIds: ReadonlySet<string>): BookRecipe[] {
  if (!Array.isArray(data)) throw new BadRecipes('het receptenboek is geen lijst')
  return (data as RawRecipe[]).map((raw, i) => {
    const where = `recept ${raw?.id ?? i}`
    if (typeof raw?.id !== 'string' || typeof raw.naam !== 'string' || typeof raw.uitleg !== 'string') throw new BadRecipes(`${where}: id, naam of uitleg ontbreekt`)
    if (!GOAL_IDS.includes(raw.doel)) throw new BadRecipes(`${where}: onbekend doel`)
    if (raw.harmonie !== undefined && !HARMONY_IDS.includes(raw.harmonie)) throw new BadRecipes(`${where}: onbekende harmonie`)
    if (!Array.isArray(raw.smaken) || raw.smaken.some((s) => !knownIds.has(s))) throw new BadRecipes(`${where}: onbekende smaak`)
    const bases = raw.basis ?? []
    if (!bases.every(isHex)) throw new BadRecipes(`${where}: een basis moet een hexwaarde zijn`)
    return { id: raw.id, name: raw.naam, note: raw.uitleg, goal: raw.doel, tastes: raw.smaken, harmony: raw.harmonie ?? null, bases, stirs: raw.roerslagen ?? 8 }
  })
}
