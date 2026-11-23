// De ene bron van de waarheid. De papieren laag en de werkplaats in 3D zijn twee weergaven van dezelfde ketel.
// Ze lezen hieruit en sturen intenties terug: add, stir, pour, bottle. Zelf houden ze niks vast

import { useSyncExternalStore } from 'react'
import { strings } from '../content/strings'
import { adjust, swapRoles, type Adjustment } from './alchemy/adjust'
import { bottle as fill, ingredientsOf, type Bottle } from './alchemy/bottle'
import { cauldron as step, emptyCauldron, type Cauldron, type CauldronAction } from './alchemy/cauldron'
import { checkPalette } from './alchemy/contrast'
import type { Hex } from './alchemy/color'
import { isSpecial, photoIngredient, type Ingredient } from './alchemy/ingredients'
import { boilState, brew, type Brew } from './alchemy/mix'
import { nameBrew } from './alchemy/names'
import { roleNumber } from './alchemy/palette'
import { encodeBottle } from './alchemy/share'
import { keepShelf, readShelf } from './keep'

/** Een gevuld flesje, met wat er bij het brouwen gebeurde (modder, het snuifje) erbij als het hier gebrouwen is */
export interface Flask {
  bottle: Bottle
  /** Null bij een flesje uit een link of van de plank: dan weten we alleen wat erin zit */
  brew: Brew | null
  /** Net uit de ketel, uit een gedeelde link, of van de plank gepakt */
  from: 'ketel' | 'link' | 'plank'
}

/** Een foto die net in de ketel gegooid is, voor het kaartje dat in 3D naar beneden dwarrelt */
export interface PhotoDrop {
  id: string
  /** Een klein plaatje, als blob-URL. Het blijft op dit apparaat */
  url: string
  at: number
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
  /** Een plank uit een gedeelde link, om te bekijken en eventueel over te nemen */
  visiting: readonly Bottle[] | null
  /** Het laatste fotokaartje */
  photoDrop: PhotoDrop | null
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
  shelf: typeof window === 'undefined' ? [] : readShelf(),
  visiting: null,
  photoDrop: null,
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
  const result = brew({ ingredients: ingredientsIn(s), stirs: s.cauldron.stirs, size: s.cauldron.size, corks: s.cauldron.corks, reroll: s.cauldron.reroll, seed: s.cauldron.seed ?? undefined })
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

  /** Roer opnieuw: een nieuwe trekking. Kleuren onder een kurk blijven staan */
  reroll() {
    const cauldron = apply({ type: 'reroll' })
    if (cauldron === state.cauldron) return
    set({ cauldron, stir: { at: now(), strokes: 2 } })
  },

  /** Eén van dit ingrediënt eruit */
  removeOne(id: string) {
    const ingredient = state.photos[id] ?? state.catalogue?.find((i) => i.id === id)
    const cauldron = apply({ type: 'remove', id })
    if (cauldron === state.cauldron) return
    set({ cauldron, ...say(strings.nieuws.eruit(capital(ingredient?.name ?? id))) })
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
    const flask: Flask = { bottle, brew: result, from: 'ketel' }
    const readable = checkPalette(bottle.swatches).every((c) => c.passes)
    set({ flask, ...say(strings.nieuws.gebotteld(name, bottle.swatches.length, readable)) })
    return flask
  },

  /** Een foto als ingrediënt: hij komt bij de foto's, en gaat meteen de ketel in */
  addPhoto(id: string, pigments: Ingredient['pigments'], url: string) {
    const ingredient = photoIngredient(id, pigments, { name: strings.namen.photo, label: strings.foto.etiket })
    set({ photos: { ...state.photos, [id]: ingredient }, photoDrop: { id, url, at: now() } })
    this.add(id)
  },

  /** Laat een flesje zien: uit een link of van de plank */
  open(bottle: Bottle, from: Flask['from']) {
    set({ flask: { bottle, brew: null, from }, ...say(strings.nieuws.geopend(bottle.name, bottle.swatches.length)) })
  },

  /** Stel één kleur in het flesje een stapje bij */
  adjust(index: number, how: Adjustment) {
    const flask = state.flask
    if (!flask?.bottle.swatches[index]) return
    const swatches = flask.bottle.swatches.map((s, i) => (i === index ? { ...s, hex: adjust(s.hex, how) } : s))
    const swatch = swatches[index]
    set({
      // Wat het snuifje deed, klopt niet meer na het bijstellen
      flask: { ...flask, bottle: { ...flask.bottle, swatches }, brew: flask.brew ? { ...flask.brew, pinch: null } : null },
      ...say(strings.nieuws.bijgesteld(strings.fles.rol(swatch.role, roleNumber(swatches, index)), strings.bijstellen[how], swatch.hex)),
    })
  },

  /** Wissel twee kleuren in het flesje van rol */
  swap(from: number, to: number) {
    const flask = state.flask
    if (!flask || from === to) return
    const swatches = swapRoles(flask.bottle.swatches, from, to)
    set({
      flask: { ...flask, bottle: { ...flask.bottle, swatches }, brew: flask.brew ? { ...flask.brew, pinch: null } : null },
      ...say(strings.nieuws.gewisseld(strings.fles.rol(swatches[from].role, roleNumber(swatches, from)), strings.fles.rol(swatches[to].role, roleNumber(swatches, to)))),
    })
  },

  /** Leg het flesje weg */
  close() {
    if (state.flask) set({ flask: null })
  },

  /** Zet het recept van een flesje terug in de ketel, om ermee verder te brouwen */
  continueFrom(bottle: Bottle) {
    const photos = { ...state.photos }
    for (const item of bottle.recipe.items) if (item.pigments) photos[item.id] = photoIngredient(item.id, item.pigments, { name: strings.namen.photo, label: strings.foto.etiket })
    const known = new Set([...(state.catalogue ?? []).map((i) => i.id), ...Object.keys(photos)])
    const items = ingredientsOf(bottle.recipe, state.catalogue ?? [], { name: strings.namen.photo, label: strings.foto.etiket })
      .map((i) => i.id)
      .filter((id) => known.has(id))
    set({ photos, cauldron: step(state.cauldron, { type: 'load', items, stirs: bottle.recipe.stirs, size: bottle.recipe.size, seed: bottle.recipe.seed }), ...say(strings.nieuws.verder(bottle.name)) })
  },

  /** Zet het flesje op de plank. Hetzelfde flesje komt er niet twee keer op */
  shelve(bottle: Bottle) {
    const code = encodeBottle(bottle)
    if (state.shelf.some((b) => encodeBottle(b) === code)) {
      set(say(strings.nieuws.alOpPlank(bottle.name)))
      return
    }
    const shelf = [...state.shelf, bottle]
    const kept = keepShelf(shelf)
    set({ shelf, ...say(strings.nieuws.opPlank(bottle.name, shelf.length) + (kept ? '' : ` ${strings.plank.nietBewaard}`)) })
  },

  /** Haal een flesje van de plank af */
  unshelve(index: number) {
    const bottle = state.shelf[index]
    if (!bottle) return
    const shelf = state.shelf.filter((_, i) => i !== index)
    keepShelf(shelf)
    set({ shelf, ...say(strings.nieuws.vanPlank(bottle.name)) })
  },

  /** Verplaats een flesje op de plank */
  move(from: number, to: number) {
    if (from === to || from < 0 || from >= state.shelf.length) return
    const target = Math.max(0, Math.min(state.shelf.length - 1, to))
    const shelf = [...state.shelf]
    const [bottle] = shelf.splice(from, 1)
    shelf.splice(target, 0, bottle)
    keepShelf(shelf)
    set({ shelf, ...say(strings.nieuws.verplaatst(bottle.name, target + 1, shelf.length)) })
  },

  /** Een plank uit een link: eerst bekijken */
  visit(bottles: readonly Bottle[]) {
    set({ visiting: bottles, ...say(strings.nieuws.bezoek(bottles.length)) })
  },

  /** Zet de flesjes van de bezochte plank op je eigen plank, of laat ze staan */
  leaveVisit(take: boolean) {
    if (!state.visiting) return
    if (!take) {
      set({ visiting: null })
      return
    }
    const known = new Set(state.shelf.map(encodeBottle))
    const shelf = [...state.shelf, ...state.visiting.filter((b) => !known.has(encodeBottle(b)))]
    keepShelf(shelf)
    set({ shelf, visiting: null, ...say(strings.nieuws.overgenomen(shelf.length)) })
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
