// De ene bron van de waarheid. De papieren laag en de werkplaats in 3D zijn twee weergaven van dezelfde ketel.
// Ze lezen hieruit en sturen intenties terug: add, stir, pour, bottle. Zelf houden ze niks vast

import { useSyncExternalStore } from 'react'
import { strings } from '../content/strings'
import { bottle as fill, type Bottle } from './alchemy/bottle'
import { cauldron as step, emptyCauldron, type Cauldron, type CauldronAction } from './alchemy/cauldron'
import { checkPalette } from './alchemy/contrast'
import type { Hex } from './alchemy/color'
import { isSpecial, type Ingredient } from './alchemy/ingredients'
import { boilState, brew, type Brew } from './alchemy/mix'
import { nameBrew } from './alchemy/names'
import { roleNumber } from './alchemy/palette'

/** Een gevuld flesje, met wat er bij het brouwen gebeurde (modder, het snuifje) erbij */
export interface Flask {
  bottle: Bottle
  brew: Brew
}

export interface State {
  /** Wat er in de kast staat, zodra het binnen is */
  catalogue: readonly Ingredient[] | null
  /** Foto's die als ingrediënt in de ketel kunnen, per id */
  photos: Readonly<Record<string, Ingredient>>
  cauldron: Cauldron
  /** Het laatst gevulde flesje */
  flask: Flask | null
  shelf: readonly Bottle[]
  /** Wat er net gebeurde, in woorden, voor de aria-live-regio */
  news: { text: string; at: number } | null
  /** Wanneer er voor het laatst geroerd werd, en hoe hard, voor de draaikolk */
  stir: { at: number; strokes: number }
}

let state: State = {
  catalogue: null,
  photos: {},
  cauldron: emptyCauldron(),
  flask: null,
  shelf: [],
  news: null,
  stir: { at: 0, strokes: 0 },
}

const listeners = new Set<() => void>()
function set(next: Partial<State>) {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

const now = () => (typeof performance === 'undefined' ? Date.now() : performance.now())
const say = (text: string) => ({ news: { text, at: now() } })

/** De ingrediënten in de ketel, opgezocht in de kast en bij de foto's */
export function ingredientsIn(s: State = state): Ingredient[] {
  if (!s.catalogue) return []
  return s.cauldron.items.flatMap((id) => {
    const found = s.photos[id] ?? s.catalogue?.find((i) => i.id === id)
    return found ? [found] : []
  })
}

let inCache: { items: Cauldron['items']; catalogue: State['catalogue']; photos: State['photos']; list: Ingredient[] } | null = null
/** Hetzelfde als ingredientsIn, maar steeds dezelfde lijst zolang er niks verandert. Voor in een hook */
export function currentIngredients(s: State = state): Ingredient[] {
  if (inCache && inCache.items === s.cauldron.items && inCache.catalogue === s.catalogue && inCache.photos === s.photos) return inCache.list
  const list = ingredientsIn(s)
  inCache = { items: s.cauldron.items, catalogue: s.catalogue, photos: s.photos, list }
  return list
}

// Het brouwsel wordt pas opnieuw berekend als de ketel, de kast of de foto's veranderen
let cache: { cauldron: Cauldron; catalogue: State['catalogue']; photos: State['photos']; brew: Brew | null } | null = null
/** Wat er nu in de ketel zit, als palet. Null als er nog geen kleur in zit */
export function currentBrew(s: State = state): Brew | null {
  if (cache && cache.cauldron === s.cauldron && cache.catalogue === s.catalogue && cache.photos === s.photos) return cache.brew
  const result = brew({ ingredients: ingredientsIn(s), stirs: s.cauldron.stirs, size: s.cauldron.size, corks: s.cauldron.corks })
  cache = { cauldron: s.cauldron, catalogue: s.catalogue, photos: s.photos, brew: result }
  return result
}

const colourCount = (s: State) => ingredientsIn(s).filter((i) => !isSpecial(i)).length
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function apply(action: CauldronAction): Cauldron {
  return step(state.cauldron, action)
}

export const store = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },

  /** Zeg iets hardop via de aria-live-regio */
  say(text: string) {
    set(say(text))
  },

  setCatalogue(catalogue: readonly Ingredient[]) {
    set({ catalogue })
  },

  /** Een potje (of een foto) in de ketel */
  add(id: string) {
    const ingredient = state.photos[id] ?? state.catalogue?.find((i) => i.id === id)
    if (!ingredient) return
    const before = boilState(colourCount(state))
    const cauldron = apply({ type: 'add', id })
    if (cauldron === state.cauldron) return
    const after = { ...state, cauldron }
    const boil = boilState(colourCount(after))
    const warning = boil !== before && boil === 'onrustig' ? ` ${strings.nieuws.onrustig}` : boil !== before && boil === 'overkoken' ? ` ${strings.nieuws.overkookt}` : ''
    set({ cauldron, ...say(strings.nieuws.erin(capital(ingredient.name), cauldron.items.length) + warning) })
  },

  /** Afscheppen: het laatste ingrediënt gaat er weer uit */
  skim() {
    const last = ingredientsIn().at(-1)
    const cauldron = apply({ type: 'skim' })
    if (cauldron === state.cauldron) return
    set({ cauldron, ...say(strings.nieuws.eruit(capital(last?.name ?? ''))) })
  },

  stir(strokes = 1) {
    const cauldron = apply({ type: 'stir', strokes })
    if (cauldron === state.cauldron) return
    const result = currentBrew({ ...state, cauldron })
    set({
      cauldron,
      stir: { at: now(), strokes },
      ...say(strings.nieuws.geroerd(strings.ketel.slagen(cauldron.stirs), strings.ketel.glad(result?.homogeneity ?? 0))),
    })
  },

  size(size: number) {
    const cauldron = apply({ type: 'size', size })
    if (cauldron !== state.cauldron) set({ cauldron, ...say(strings.nieuws.grootte(cauldron.size)) })
  },

  /** Kurk erop of eraf. Een kleur onder een kurk blijft staan als je opnieuw roert */
  cork(index: number, hex: Hex | null) {
    const cauldron = apply({ type: 'cork', index, hex })
    if (cauldron === state.cauldron) return
    const swatches = state.flask?.bottle.swatches ?? currentBrew()?.swatches ?? []
    const rol = swatches[index] ? strings.fles.rol(swatches[index].role, roleNumber(swatches, index)) : ''
    set({ cauldron, ...say(strings.nieuws.kurk(rol, hex !== null)) })
  },

  empty() {
    set({ cauldron: apply({ type: 'empty' }), ...say(strings.nieuws.geleegd) })
  },

  /** Schenk de ketel in een flesje, met een naam op het etiket */
  pour(): Flask | null {
    const result = currentBrew()
    if (!result) return null
    const ingredients = ingredientsIn()
    const name = nameBrew(result, ingredients, strings.namen)
    const bottle = fill(result, ingredients, state.cauldron.stirs, state.cauldron.size, name)
    const flask = { bottle, brew: result }
    const readable = checkPalette(bottle.swatches).every((c) => c.passes)
    set({ flask, ...say(strings.nieuws.gebotteld(name, bottle.swatches.length, readable)) })
    return flask
  },
}

/** Lees een stukje van de staat. De selector moet iets teruggeven dat stabiel is zolang het niet verandert */
export function useAlchemy<T>(select: (s: State) => T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => select(state),
    () => select(state),
  )
}

/** Het brouwsel van nu, opnieuw berekend alleen als de ketel verandert */
export const useBrew = () => useAlchemy(currentBrew)
