import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { strings } from '../../content/strings'
import { parseIngredients } from './ingredients.ts'
import { brew } from './mix.ts'
import { nameBrew } from './names.ts'

const shelf = parseIngredients(JSON.parse(readFileSync(new URL('../../../public/data/ingredients.json', import.meta.url), 'utf8')))
const take = (...ids: string[]) => ids.map((id) => shelf.find((i) => i.id === id)!)

describe('nameBrew', () => {
  it('geeft hetzelfde brouwsel dezelfde naam', () => {
    const ingredients = take('mos', 'koper')
    const result = brew({ ingredients, stirs: 4, size: 5 })!
    expect(nameBrew(result, ingredients, strings.namen)).toBe(nameBrew(result, ingredients, strings.namen))
  })

  it('noemt het belangrijkste ingrediënt, met een hoofdletter', () => {
    const ingredients = take('mos')
    const name = nameBrew(brew({ ingredients, stirs: 4, size: 5 })!, ingredients, strings.namen)
    expect(name.startsWith('Mos ')).toBe(true)
  })

  it('kiest het potje dat het vaakst in de ketel ging', () => {
    for (let reroll = 0; reroll < 10; reroll++) {
      const ingredients = take('klei', 'inkt', 'inkt')
      const name = nameBrew(brew({ ingredients, stirs: 3, size: 5, reroll })!, ingredients, strings.namen)
      expect(name.startsWith('Inkt ')).toBe(true)
    }
  })

  it('is eerlijk over modder', () => {
    const ingredients = take('neon', 'citroen', 'lavendel', 'zeeschuim', 'kersenbloesem', 'diepzee')
    expect(nameBrew(brew({ ingredients, stirs: 4, size: 5 })!, ingredients, strings.namen)).toBe('Modder, maar wel van jou')
  })

  it('maakt verschillende namen bij opnieuw roeren', () => {
    const ingredients = take('zonsondergang', 'lavendel')
    const names = new Set(Array.from({ length: 30 }, (_, reroll) => nameBrew(brew({ ingredients, stirs: 4, size: 5, reroll })!, ingredients, strings.namen)))
    expect(names.size).toBeGreaterThan(5)
  })
})
