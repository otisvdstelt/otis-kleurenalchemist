import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseIngredients } from './alchemy/ingredients'
import { checkPalette } from './alchemy/contrast'
import { currentBrew, store } from './store'

store.setCatalogue(parseIngredients(JSON.parse(readFileSync(new URL('../../public/data/ingredients.json', import.meta.url), 'utf8'))))

describe('store', () => {
  it('brouwt, roert en bottelt, en zegt wat er gebeurt', () => {
    store.add('mos')
    expect(store.get().news?.text).toBe('Mos in de ketel. Eén ingrediënt.')
    store.add('koper')
    store.stir(3)
    expect(store.get().cauldron.stirs).toBe(3)
    const brew = currentBrew()
    expect(brew).not.toBeNull()
    // Zolang de ketel niet verandert, is het brouwsel hetzelfde object
    expect(currentBrew()).toBe(brew)
    const flask = store.pour()!
    expect(flask.bottle.swatches).toEqual(brew!.swatches)
    expect(store.get().news?.text).toMatch(/^Flesje gevuld: .+, vijf kleuren, /)
  })

  it('waarschuwt bij onrustig borrelen en overkoken', () => {
    store.empty()
    for (const id of ['mos', 'klei', 'neon', 'citroen']) store.add(id)
    store.add('lavendel')
    expect(store.get().news?.text).toContain('borrelt onrustig')
    store.add('inkt')
    expect(store.get().news?.text).toContain('kookt over')
    store.skim()
    expect(store.get().news?.text).toBe('Inkt afgeschept.')
  })

  it('maakt ongedaan, en een reeks slagen telt als één stap', () => {
    store.empty()
    store.add('mos')
    store.add('klei')
    store.stir(1)
    store.stir(1)
    store.stir(1)
    expect(store.get().cauldron.stirs).toBe(3)
    store.undo()
    expect(store.get().cauldron).toMatchObject({ items: ['mos', 'klei'], stirs: 0 })
    store.undo()
    expect(store.get().cauldron.items).toEqual(['mos'])
  })

  it('onthoudt de laatste vijf flesjes, nieuwste eerst', () => {
    store.empty()
    for (const id of ['mos', 'klei', 'neon', 'inkt', 'as', 'citroen']) {
      store.empty()
      store.add(id)
      store.pour()
    }
    const recent = store.get().recent
    expect(recent).toHaveLength(5)
    expect(recent[0].recipe.items[0].id).toBe('citroen')
  })

  it('het snuifje werkt opnieuw na bijstellen, op het palet zoals het dan is', () => {
    store.empty()
    store.add('zonsondergang')
    store.pour()
    store.pinchFlask()
    expect(checkPalette(store.get().flask!.bottle.swatches).every((c) => c.passes)).toBe(true)
    // Duw de tekst richting de achtergrond tot hij te zwak is
    const text = store.get().flask!.bottle.swatches.findIndex((s) => s.role === 'tekst')
    for (let i = 0; i < 14; i++) store.adjust(text, 'lichter')
    expect(checkPalette(store.get().flask!.bottle.swatches).some((c) => !c.passes)).toBe(true)
    expect(store.get().flask!.pinch).toBeNull()
    store.pinchFlask()
    expect(checkPalette(store.get().flask!.bottle.swatches).every((c) => c.passes)).toBe(true)
    expect(store.get().flask!.pinch!.changed).toContain(text)
  })

  it('negeert wat niet in de kast staat', () => {
    store.empty()
    store.add('drakenbloed')
    expect(store.get().cauldron.items).toEqual([])
    expect(store.pour()).toBeNull()
  })
})
