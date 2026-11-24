import { queryOptions, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { parseRecipes, type BookRecipe } from '../lib/alchemy/recipes'
import { store, useAlchemy } from '../lib/store'

/** Het receptenboek. Het komt mee met de site, dus het wordt één keer opgehaald */
export function useRecipes() {
  const catalogue = useAlchemy((s) => s.catalogue)
  const query = useQuery(
    queryOptions({
      queryKey: ['recipes', catalogue?.length ?? 0],
      enabled: Boolean(catalogue),
      staleTime: Infinity,
      gcTime: Infinity,
      retry: 1,
      queryFn: async (): Promise<BookRecipe[]> => {
        const response = await fetch(`${import.meta.env.BASE_URL}data/recipes.json`)
        if (!response.ok) throw new Error(`Het receptenboek kwam niet (${response.status}).`)
        return parseRecipes(await response.json(), new Set((catalogue ?? []).map((i) => i.id)))
      },
    }),
  )
  useEffect(() => {
    if (query.data) store.setRecipes(query.data)
  }, [query.data])
  return query
}
