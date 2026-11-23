import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseIngredients } from './alchemy/ingredients'
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

  it('negeert wat niet in de kast staat', () => {
    store.empty()
    store.add('drakenbloed')
    expect(store.get().cauldron.items).toEqual([])
    expect(store.pour()).toBeNull()
  })
})
