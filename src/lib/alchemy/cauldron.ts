// Wat er in de ketel zit, en wat je ermee kunt doen. Een pure reducer: de store om hem heen houdt hem vast

import type { Hex } from './color.ts'
import { clampSize, DEFAULT_SIZE } from './palette.ts'

/** Meer dan dit past er echt niet in, ook niet als het al overkookt */
export const MAX_ITEMS = 12

export interface Cauldron {
  /** Ids van de ingrediënten, in de volgorde waarin ze erin gingen */
  items: string[]
  stirs: number
  size: number
  /** Kleuren onder een kurk, per plek in het palet */
  corks: (Hex | null)[]
}

export type CauldronAction =
  | { type: 'add'; id: string }
  /** Afscheppen: het laatste ingrediënt gaat er weer uit */
  | { type: 'skim' }
  | { type: 'stir'; strokes?: number }
  | { type: 'size'; size: number }
  | { type: 'cork'; index: number; hex: Hex | null }
  | { type: 'empty' }
  | { type: 'load'; items: string[]; stirs: number; size: number }

export const emptyCauldron = (size = DEFAULT_SIZE): Cauldron => ({ items: [], stirs: 0, size: clampSize(size), corks: [] })

export function cauldron(state: Cauldron, action: CauldronAction): Cauldron {
  switch (action.type) {
    case 'add':
      if (state.items.length >= MAX_ITEMS) return state
      // Iets nieuws erin is nog niet doorgeroerd
      return { ...state, items: [...state.items, action.id], stirs: 0 }
    case 'skim':
      if (state.items.length === 0) return state
      return { ...state, items: state.items.slice(0, -1) }
    case 'stir':
      if (state.items.length === 0) return state
      return { ...state, stirs: state.stirs + Math.max(1, Math.round(action.strokes ?? 1)) }
    case 'size': {
      const size = clampSize(action.size)
      // Een andere grootte geeft andere rollen, dus de kurken gaan eraf
      return size === state.size ? state : { ...state, size, corks: [] }
    }
    case 'cork': {
      if (action.index < 0 || action.index >= state.size) return state
      const corks = Array.from({ length: state.size }, (_, i) => state.corks[i] ?? null)
      corks[action.index] = action.hex
      return { ...state, corks }
    }
    case 'empty':
      return emptyCauldron(state.size)
    case 'load':
      return { items: action.items.slice(0, MAX_ITEMS), stirs: Math.max(0, Math.round(action.stirs)), size: clampSize(action.size), corks: [] }
  }
}
