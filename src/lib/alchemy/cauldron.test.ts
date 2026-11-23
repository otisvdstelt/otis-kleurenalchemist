import { describe, expect, it } from 'vitest'
import { cauldron, emptyCauldron, MAX_ITEMS, type Cauldron, type CauldronAction } from './cauldron.ts'

const run = (...actions: CauldronAction[]): Cauldron => actions.reduce(cauldron, emptyCauldron())

describe('cauldron', () => {
  it('begint leeg, met vijf kleuren', () => {
    expect(emptyCauldron()).toEqual({ items: [], stirs: 0, size: 5, corks: [] })
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
    expect(run({ type: 'load', items: ['mos', 'klei'], stirs: 7, size: 4 })).toEqual({ items: ['mos', 'klei'], stirs: 7, size: 4, corks: [] })
  })
})
