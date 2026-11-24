import { useEffect, useMemo, useRef } from 'react'
import { strings } from '../../content/strings'
import { plainName } from '../../lib/alchemy/ingredients'
import { brew } from '../../lib/alchemy/mix'
import type { BookRecipe } from '../../lib/alchemy/recipes'
import { store, useAlchemy } from '../../lib/store'

const SEEN = 'kleurenalchemist-boek'

function seen(): boolean {
  try {
    return window.localStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN, '1')
  } catch {
    // Dan ligt het boek de volgende keer weer open
  }
}

/** Het receptenboek op de werkbank. Bij een eerste bezoek ligt het opengeslagen */
export function Boek({ firstVisit }: { firstVisit: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const recipes = useAlchemy((s) => s.recipes)
  const catalogue = useAlchemy((s) => s.catalogue)

  useEffect(() => {
    if (!firstVisit || recipes.length === 0 || seen()) return
    markSeen()
    dialog.current?.showModal()
  }, [firstVisit, recipes.length])

  const open = () => {
    markSeen()
    dialog.current?.showModal()
  }
  const take = (recipe: BookRecipe) => {
    store.loadRecipe(recipe)
    dialog.current?.close()
  }

  return (
    <>
      <button type="button" className="slip paper schakelaar kop-boek" aria-haspopup="dialog" onClick={open}>
        {strings.boek.knop}
      </button>
      <dialog ref={dialog} className="colofon boek" aria-labelledby="boek-kop" onClick={(event) => event.target === dialog.current && dialog.current?.close()}>
        <div className="colofon-vel boek-vel">
          <div className="colofon-boven">
            <h2 id="boek-kop" className="colofon-kop">
              {strings.boek.kop}
            </h2>
            <button type="button" className="quiet" onClick={() => dialog.current?.close()}>
              {strings.boek.sluit}
            </button>
          </div>
          <p className="boek-intro">{strings.boek.intro}</p>
          <ol className="boek-bladzijden">
            {recipes.map((recipe) => (
              <Bladzijde key={recipe.id} recipe={recipe} names={(id) => (catalogue?.find((i) => i.id === id) ? plainName(catalogue.find((i) => i.id === id)!) : id)} onTake={take} />
            ))}
          </ol>
          <button type="button" className="quiet" onClick={() => dialog.current?.close()}>
            {strings.boek.zelf}
          </button>
        </div>
      </dialog>
    </>
  )
}

function Bladzijde({ recipe, names, onTake }: { recipe: BookRecipe; names: (id: string) => string; onTake: (recipe: BookRecipe) => void }) {
  const catalogue = useAlchemy((s) => s.catalogue)
  // Een voorproefje: het recept gebrouwen zoals het in het boek staat
  const preview = useMemo(() => {
    if (!catalogue) return []
    const ingredients = [...recipe.tastes, ...(recipe.harmony ? [recipe.harmony] : [])].flatMap((id) => catalogue.find((i) => i.id === id) ?? [])
    return brew({ ingredients, goal: recipe.goal, bases: recipe.bases, stirs: recipe.stirs })?.swatches.slice(0, 7) ?? []
  }, [catalogue, recipe])
  return (
    <li className="bladzijde">
      <p className="bladzijde-naam">{recipe.name}</p>
      <p className="bladzijde-uitleg">{recipe.note}</p>
      <p className="bladzijde-recept hand">
        {strings.doelen[recipe.goal]} {strings.boek.smaken} {recipe.tastes.map(names).join(' en ')}
        {recipe.harmony ? `, ${strings.harmonieen[recipe.harmony]}` : ''}
      </p>
      <ul className="bladzijde-kleuren" aria-hidden="true">
        {preview.map((s, i) => (
          <li key={i} style={{ background: s.hex }} />
        ))}
      </ul>
      <button type="button" className="inked" aria-label={`${strings.boek.brouw}: ${recipe.name}`} onClick={() => onTake(recipe)}>
        {strings.boek.brouw}
      </button>
    </li>
  )
}
