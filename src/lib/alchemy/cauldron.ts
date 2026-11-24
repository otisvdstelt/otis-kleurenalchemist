// Wat er in de ketel zit, en wat je ermee kunt doen. Een pure reducer: de store om hem heen houdt hem vast

import { isHex, type Hex } from './color.ts'
import type { GoalId } from './ingredients.ts'
import { DEFAULT_GOAL } from './goals.ts'
import { clampSize, DEFAULT_SIZE } from './palette.ts'

/** Meer dan dit past er echt niet in, ook niet als het al overkookt */
export const MAX_ITEMS = 12

/** Hooguit twee basiskleuren: de hoofdkleur, en eventueel het accent */
export const MAX_BASES = 2

export interface Cauldron {
  /** Waar het palet voor is. Er is altijd precies één doel */
  goal: GoalId
  /** Jouw eigen kleuren, die precies zo blijven */
  bases: Hex[]
  /** Ids van smaken, harmonieën en bewerkingen, in de volgorde waarin ze erin gingen */
  items: string[]
  stirs: number
  size: number
  /** Kleuren onder een kurk, per plek in het palet */
  corks: (Hex | null)[]
  /** Hoe vaak er opnieuw geroerd is. Alleen dat trekt een nieuw palet, gewoon roeren maakt het gladder */
  reroll: number
  /** De seed van een recept uit een flesje, zolang er niks aan veranderd is */
  seed: number | null
}

export type CauldronAction =
  | { type: 'add'; id: string }
  /** Afscheppen: het laatste ingrediënt gaat er weer uit */
  | { type: 'skim' }
  | { type: 'stir'; strokes?: number }
  /** Roer opnieuw: een nieuwe trekking, met de kurken nog op hun plek */
  | { type: 'reroll' }
  | { type: 'size'; size: number }
  | { type: 'cork'; index: number; hex: Hex | null }
  | { type: 'empty' }
  | { type: 'load'; items: string[]; stirs: number; size: number; seed?: number; goal?: GoalId; bases?: Hex[] }
  /** Een ander doel. Het palet krijgt een andere opbouw, dus de kurken gaan eraf */
  | { type: 'goal'; goal: GoalId }
  /** Een basiskleur erbij, of op plek `index` een andere */
  | { type: 'base'; hex: Hex; index?: number }
  | { type: 'unbase'; index: number }
  /** Eén van dit ingrediënt eruit, het laatst toegevoegde */
  | { type: 'remove'; id: string }

export const emptyCauldron = (size = DEFAULT_SIZE, goal: GoalId = DEFAULT_GOAL): Cauldron => ({ goal, bases: [], items: [], stirs: 0, size: clampSize(size), corks: [], reroll: 0, seed: null })

export function cauldron(state: Cauldron, action: CauldronAction): Cauldron {
  switch (action.type) {
    case 'add':
      if (state.items.length >= MAX_ITEMS) return state
      // Iets nieuws erin is nog niet doorgeroerd
      return { ...state, items: [...state.items, action.id], stirs: 0, seed: null }
    case 'skim':
      if (state.items.length === 0) return state
      return { ...state, items: state.items.slice(0, -1), seed: null }
    case 'remove': {
      const at = state.items.lastIndexOf(action.id)
      if (at < 0) return state
      return { ...state, items: state.items.filter((_, i) => i !== at), seed: null }
    }
    case 'reroll':
      if (state.items.length === 0) return state
      return { ...state, reroll: state.reroll + 1, stirs: state.stirs + 1, seed: null }
    case 'stir':
      if (state.items.length === 0) return state
      return { ...state, stirs: state.stirs + Math.max(1, Math.round(action.strokes ?? 1)) }
    case 'size': {
      const size = clampSize(action.size)
      // Een andere grootte geeft andere rollen, dus de kurken gaan eraf
      return size === state.size ? state : { ...state, size, corks: [], seed: null }
    }
    case 'cork': {
      if (action.index < 0 || action.index >= state.size) return state
      const corks = Array.from({ length: state.size }, (_, i) => state.corks[i] ?? null)
      corks[action.index] = action.hex
      return { ...state, corks }
    }
    case 'empty':
      return emptyCauldron(state.size, state.goal)
    case 'load':
      return {
        goal: action.goal ?? state.goal,
        bases: (action.bases ?? []).filter(isHex).slice(0, MAX_BASES),
        items: action.items.slice(0, MAX_ITEMS),
        stirs: Math.max(0, Math.round(action.stirs)),
        size: clampSize(action.size),
        corks: [],
        reroll: 0,
        seed: action.seed ?? null,
      }
    case 'goal':
      return action.goal === state.goal ? state : { ...state, goal: action.goal, corks: [], seed: null }
    case 'base': {
      if (!isHex(action.hex)) return state
      const bases = [...state.bases]
      if (action.index !== undefined && action.index < bases.length) bases[action.index] = action.hex
      else if (bases.length < MAX_BASES) bases.push(action.hex)
      else return state
      return { ...state, bases, corks: [], seed: null }
    }
    case 'unbase':
      if (!state.bases[action.index]) return state
      return { ...state, bases: state.bases.filter((_, i) => i !== action.index), corks: [], seed: null }
  }
}
