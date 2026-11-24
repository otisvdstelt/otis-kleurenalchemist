import { describe, expect, it } from 'vitest'
import { cauldron, emptyCauldron, MAX_ITEMS, type Cauldron, type CauldronAction } from './cauldron.ts'

const run = (...actions: CauldronAction[]): Cauldron => actions.reduce(cauldron, emptyCauldron())

describe('cauldron', () => {
  it('begint leeg, met vijf kleuren', () => {
    expect(emptyCauldron()).toEqual({ goal: 'website', bases: [], items: [], stirs: 0, size: 5, corks: [], reroll: 0, seed: null })
  })

  it('iets erin gooien zet het roeren terug op nul', () => {
    const state = run({ type: 'add', id: 'mos' }, { type: 'stir', strokes: 4 }, { type: 'add', id: 'neon' })
    expect(state.items).toEqual(['mos', 'neon'])
    expect(state.stirs).toBe(0)
  })

  it('afscheppen haalt het laatste ingrediënt eruit', () => {
    const state = run({ type: 'add', id: 'mos' }, { type: 'add', id: 'neon' }, { type: 'skim' })
    expect(state.items).toEqual(['mos'])
    expect(run({ type: 'skim' })).toEqual(emptyCauldron())
  })

  it('in een lege ketel valt niks te roeren', () => {
    expect(run({ type: 'stir' }).stirs).toBe(0)
    expect(run({ type: 'add', id: 'mos' }, { type: 'stir' }, { type: 'stir', strokes: 3 }).stirs).toBe(4)
  })

  it('houdt de grootte tussen drie en zeven, en haalt dan de kurken eraf', () => {
    const corked = run({ type: 'add', id: 'mos' }, { type: 'cork', index: 2, hex: '#123456' })
    expect(corked.corks).toEqual([null, null, '#123456', null, null])
    expect(cauldron(corked, { type: 'size', size: 9 })).toMatchObject({ size: 7, corks: [] })
    expect(cauldron(corked, { type: 'size', size: 1 }).size).toBe(3)
  })

  it('een kurk blijft zitten als er iets bij komt', () => {
    const state = run({ type: 'add', id: 'mos' }, { type: 'cork', index: 0, hex: '#eeeeee' }, { type: 'add', id: 'klei' })
    expect(state.corks[0]).toBe('#eeeeee')
    expect(cauldron(state, { type: 'cork', index: 0, hex: null }).corks[0]).toBeNull()
    expect(cauldron(state, { type: 'cork', index: 9, hex: '#000000' })).toBe(state)
  })

  it('er past een maximum in', () => {
    const state = run(...Array.from({ length: MAX_ITEMS + 3 }, () => ({ type: 'add', id: 'as' }) as const))
    expect(state.items).toHaveLength(MAX_ITEMS)
  })

  it('leegmaken houdt de grootte, laden zet een recept terug', () => {
    expect(run({ type: 'size', size: 6 }, { type: 'add', id: 'mos' }, { type: 'empty' })).toEqual(emptyCauldron(6))
    expect(run({ type: 'load', items: ['mos', 'klei'], stirs: 7, size: 4, seed: 99, goal: 'affiche', bases: ['#3b533e'] })).toEqual({ goal: 'affiche', bases: ['#3b533e'], items: ['mos', 'klei'], stirs: 7, size: 4, corks: [], reroll: 0, seed: 99 })
  })

  it('heeft altijd één doel, en hooguit twee basiskleuren', () => {
    const state = run({ type: 'goal', goal: 'donker' }, { type: 'base', hex: '#111111' }, { type: 'base', hex: '#222222' }, { type: 'base', hex: '#333333' })
    expect(state.goal).toBe('donker')
    expect(state.bases).toEqual(['#111111', '#222222'])
    expect(cauldron(state, { type: 'base', hex: '#444444', index: 1 }).bases).toEqual(['#111111', '#444444'])
    expect(cauldron(state, { type: 'unbase', index: 0 }).bases).toEqual(['#222222'])
    expect(cauldron(state, { type: 'base', hex: 'rood' })).toBe(state)
    // Leegmaken houdt het doel, en de basis gaat eruit
    expect(cauldron(state, { type: 'empty' })).toMatchObject({ goal: 'donker', bases: [] })
  })

  it('opnieuw roeren telt op, en een verandering laat de vaste seed los', () => {
    const loaded = run({ type: 'load', items: ['mos'], stirs: 2, size: 5, seed: 7 })
    expect(cauldron(loaded, { type: 'stir' }).seed).toBe(7)
    expect(cauldron(loaded, { type: 'reroll' })).toMatchObject({ reroll: 1, seed: null })
    expect(cauldron(loaded, { type: 'add', id: 'klei' }).seed).toBeNull()
  })

  it('haalt één van een ingrediënt eruit, het laatst toegevoegde', () => {
    const state = run({ type: 'add', id: 'mos' }, { type: 'add', id: 'klei' }, { type: 'add', id: 'mos' })
    expect(cauldron(state, { type: 'remove', id: 'mos' }).items).toEqual(['mos', 'klei'])
    expect(cauldron(state, { type: 'remove', id: 'neon' })).toBe(state)
  })
})
