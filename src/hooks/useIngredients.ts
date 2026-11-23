import { queryOptions, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { parseIngredients, type Ingredient } from '../lib/alchemy/ingredients'
import { store } from '../lib/store'

async function fetchIngredients(): Promise<Ingredient[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/ingredients.json`)
  if (!response.ok) throw new Error(`De potjes kwamen niet (${response.status}).`)
  return parseIngredients(await response.json())
}

/** Wat er in de kast staat. Het komt mee met de site, dus het wordt één keer opgehaald en bewaard */
export const ingredientsQuery = queryOptions({
  queryKey: ['ingredients'],
  queryFn: fetchIngredients,
  staleTime: Infinity,
  gcTime: Infinity,
  retry: 1,
})

/** Haal de kast op en zet hem in de store zodra hij er is */
export function useIngredients() {
  const query = useQuery(ingredientsQuery)
  useEffect(() => {
    if (query.data) store.setCatalogue(query.data)
  }, [query.data])
  return query
}
