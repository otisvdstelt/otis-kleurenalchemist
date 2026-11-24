// De ene bron van de waarheid. De papieren laag en de werkplaats in 3D zijn twee weergaven van dezelfde ketel.
// Ze lezen hieruit en sturen intenties terug: add, stir, pour, bottle. Zelf houden ze niks vast

import { useSyncExternalStore } from 'react'
import { strings } from '../content/strings'
import { adjust, swapRoles, type Adjustment } from './alchemy/adjust'
import { bottle as fill, ingredientsOf, type Bottle } from './alchemy/bottle'
import { cauldron as step, emptyCauldron, type Cauldron, type CauldronAction } from './alchemy/cauldron'
import { checkPalette } from './alchemy/contrast'
import { pinch } from './alchemy/pinch'
import type { Hex } from './alchemy/color'
import { isSpecial, photoIngredient, plainName, type Ingredient } from './alchemy/ingredients'
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
  /** Wat het laatste snuifje contrast deed, voor en na. Weg zodra je iets bijstelt */
  pinch?: Brew['pinch']
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
  /** Hoe de ketel eerder was, voor ongedaan maken. Nieuwste achteraan */
  past: readonly Cauldron[]
  /** Het flesje dat net van de plank gehaald is, om terug te zetten */
  removed: { bottle: Bottle; index: number } | null
  /** De laatste vijf flesjes die uit de ketel kwamen, nieuwste eerst */
  recent: readonly Bottle[]
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
  past: [],
  recent: [],
  removed: null,
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
  const result = brew({ ingredients: ingredientsIn(s), goal: s.cauldron.goal, bases: s.cauldron.bases, stirs: s.cauldron.stirs, corks: s.cauldron.corks, reroll: s.cauldron.reroll, seed: s.cauldron.seed ?? undefined })
  cache = { cauldron: s.cauldron, catalogue: s.catalogue, photos: s.photos, brew: result }
  return result
}

const tasteCount = (s: State) => ingredientsIn(s).filter((i) => i.kind === 'smaak').length
const harmonyCount = (s: State) => ingredientsIn(s).filter((i) => i.kind === 'harmonie').length
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function apply(action: CauldronAction): Cauldron {
  return step(state.cauldron, action)
}

const PAST = 25
let lastStirAt = -Infinity
/** Onthoud hoe de ketel was, vóór een verandering. Een reeks slagen achter elkaar telt als één stap */
function remember(next: Cauldron, stirring = false): Pick<State, 'past'> | Record<string, never> {
  if (next === state.cauldron) return {}
  const t = now()
  const coalesce = stirring && t - lastStirAt < 1500
  lastStirAt = stirring ? t : -Infinity
  if (coalesce) return {}
  return { past: [...state.past, state.cauldron].slice(-PAST) }
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
    const before = boilState(tasteCount(state), harmonyCount(state))
    const cauldron = apply({ type: 'add', id })
    if (cauldron === state.cauldron) return
    const after = { ...state, cauldron }
    const boil = boilState(tasteCount(after), harmonyCount(after))
    const warning = boil !== before && boil === 'onrustig' ? ` ${strings.nieuws.onrustig}` : boil !== before && boil === 'overkoken' ? ` ${strings.nieuws.overkookt}` : ''
    set({ cauldron, ...remember(cauldron), ...say(strings.nieuws.erin(capital(plainName(ingredient)), cauldron.items.length) + warning) })
  },

  /** Afscheppen: het laatste ingrediënt gaat er weer uit */
  skim() {
    const last = ingredientsIn().at(-1)
    const cauldron = apply({ type: 'skim' })
    if (cauldron === state.cauldron) return
    set({ cauldron, ...remember(cauldron), ...say(strings.nieuws.eruit(capital(last ? plainName(last) : ''))) })
  },

  stir(strokes = 1) {
    const cauldron = apply({ type: 'stir', strokes })
    if (cauldron === state.cauldron) return
    const result = currentBrew({ ...state, cauldron })
    set({
      cauldron,
      ...remember(cauldron, true),
      stir: { at: now(), strokes },
      ...say(strings.nieuws.geroerd(strings.ketel.slagen(cauldron.stirs), strings.ketel.glad(result?.homogeneity ?? 0))),
    })
  },

  /** Verras me: een paar willekeurige potjes, al een beetje geroerd */
  surprise() {
    const colours = (state.catalogue ?? []).filter((i) => !isSpecial(i))
    if (colours.length === 0) return
    const count = 2 + Math.floor(Math.random() * 2)
    const picked: Ingredient[] = []
    while (picked.length < count) {
      const next = colours[Math.floor(Math.random() * colours.length)]
      if (!picked.includes(next)) picked.push(next)
    }
    let cauldron = step(emptyCauldron(state.cauldron.size), { type: 'load', items: picked.map((i) => i.id), stirs: 2 + Math.floor(Math.random() * 10), size: state.cauldron.size })
    cauldron = { ...cauldron, seed: null, reroll: Math.floor(Math.random() * 1000) }
    set({ cauldron, ...remember(cauldron), stir: { at: now(), strokes: 3 }, ...say(strings.nieuws.verrast(picked.map(plainName))) })
  },

  /** Roer opnieuw: een nieuwe trekking. Kleuren onder een kurk blijven staan */
  reroll() {
    const cauldron = apply({ type: 'reroll' })
    if (cauldron === state.cauldron) return
    set({ cauldron, ...remember(cauldron), stir: { at: now(), strokes: 2 } })
  },

  /** Eén van dit ingrediënt eruit */
  removeOne(id: string) {
    const ingredient = state.photos[id] ?? state.catalogue?.find((i) => i.id === id)
    const cauldron = apply({ type: 'remove', id })
    if (cauldron === state.cauldron) return
    set({ cauldron, ...remember(cauldron), ...say(strings.nieuws.eruit(capital(ingredient ? plainName(ingredient) : id))) })
  },

  size(size: number) {
    const cauldron = apply({ type: 'size', size })
    if (cauldron !== state.cauldron) set({ cauldron, ...remember(cauldron), ...say(strings.nieuws.grootte(cauldron.size)) })
  },

  /** Kurk erop of eraf. Een kleur onder een kurk blijft staan als je opnieuw roert */
  cork(index: number, hex: Hex | null) {
    const cauldron = apply({ type: 'cork', index, hex })
    if (cauldron === state.cauldron) return
    const swatches = state.flask?.bottle.swatches ?? currentBrew()?.swatches ?? []
    const rol = swatches[index] ? strings.fles.rol(swatches[index].role, roleNumber(swatches, index)) : ''
    set({ cauldron, ...remember(cauldron), ...say(strings.nieuws.kurk(rol, hex !== null)) })
  },

  empty() {
    const cauldron = apply({ type: 'empty' })
    set({ cauldron, ...remember(cauldron), ...say(strings.nieuws.geleegd) })
  },

  /** Schenk de ketel in een flesje, met een naam op het etiket */
  pour(): Flask | null {
    const result = currentBrew()
    if (!result) return null
    const ingredients = ingredientsIn()
    const name = nameBrew(result, ingredients, strings.namen, state.cauldron.bases)
    const bottle = fill(result, ingredients, state.cauldron.stirs, state.cauldron.size, name, undefined, { bases: state.cauldron.bases, reroll: state.cauldron.reroll })
    const flask: Flask = { bottle, brew: result, from: 'ketel', pinch: result.pinch }
    const readable = checkPalette(bottle.swatches).every((c) => c.passes)
    const recent = [bottle, ...state.recent.filter((b) => encodeBottle(b) !== encodeBottle(bottle))].slice(0, 5)
    set({ flask, recent, ...say(strings.nieuws.gebotteld(name, bottle.swatches.length, readable)) })
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
      flask: { ...flask, bottle: { ...flask.bottle, swatches }, pinch: null },
      ...say(strings.nieuws.bijgesteld(strings.fles.rol(swatch.role, roleNumber(swatches, index)), strings.bijstellen[how], swatch.hex)),
    })
  },

  /** Wissel twee kleuren in het flesje van rol */
  swap(from: number, to: number) {
    const flask = state.flask
    if (!flask || from === to) return
    const swatches = swapRoles(flask.bottle.swatches, from, to)
    set({
      flask: { ...flask, bottle: { ...flask.bottle, swatches }, pinch: null },
      ...say(strings.nieuws.gewisseld(strings.fles.rol(swatches[from].role, roleNumber(swatches, from)), strings.fles.rol(swatches[to].role, roleNumber(swatches, to)))),
    })
  },

  /** Maak de laatste verandering aan de ketel ongedaan */
  undo() {
    const previous = state.past.at(-1)
    if (!previous) return
    lastStirAt = -Infinity
    set({ cauldron: previous, past: state.past.slice(0, -1), ...say(strings.nieuws.ongedaan) })
  },

  /**
   * Een snuifje contrast op het flesje zoals het nu is, ook na bijstellen of uit een link.
   * Het schuift alleen de lichtheid, zo weinig mogelijk, tot elk paar zijn drempel haalt
   */
  pinchFlask() {
    const flask = state.flask
    if (!flask) return
    const before = flask.bottle.swatches
    const result = pinch(before)
    if (result.changed.length === 0) return
    const bottle = { ...flask.bottle, swatches: result.swatches }
    const readable = checkPalette(result.swatches).every((c) => c.passes)
    set({ flask: { ...flask, bottle, pinch: { before, changed: result.changed, unreachable: result.unreachable } }, ...say(strings.nieuws.gesnuifd(result.changed.length, readable)) })
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
    const cauldron = step(state.cauldron, { type: 'load', items, stirs: bottle.recipe.stirs, size: bottle.recipe.size, seed: bottle.recipe.seed })
    set({ photos, cauldron, ...remember(cauldron), ...say(strings.nieuws.verder(bottle.name)) })
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
    set({ shelf, removed: { bottle, index }, ...say(strings.nieuws.vanPlank(bottle.name)) })
  },

  /** Zet het flesje dat net van de plank ging, terug op zijn plek */
  restore() {
    const removed = state.removed
    if (!removed) return
    const shelf = [...state.shelf]
    shelf.splice(Math.min(removed.index, shelf.length), 0, removed.bottle)
    keepShelf(shelf)
    set({ shelf, removed: null, ...say(strings.nieuws.teruggezet(removed.bottle.name)) })
  },

  /** Vergeet het weggehaalde flesje: terugzetten kan niet meer */
  forgetRemoved() {
    if (state.removed) set({ removed: null })
  },

  /** Geef het flesje een andere naam. Staat het op de plank, of bij eerder gebrouwen, dan daar ook */
  rename(name: string) {
    const flask = state.flask
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!flask || !clean || clean === flask.bottle.name) return
    const before = encodeBottle(flask.bottle)
    const bottle = { ...flask.bottle, name: clean }
    const swap = (list: readonly Bottle[]) => list.map((b) => (encodeBottle(b) === before ? bottle : b))
    const shelf = swap(state.shelf)
    if (shelf.some((b) => b === bottle)) keepShelf(shelf)
    set({ flask: { ...flask, bottle }, shelf, recent: swap(state.recent), ...say(strings.nieuws.hernoemd(clean)) })
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
