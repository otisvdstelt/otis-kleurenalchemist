import type { ReactNode } from 'react'
import { strings } from '../../content/strings'
import { isSpecial, plainName, type Ingredient } from '../../lib/alchemy/ingredients'
import { store, useAlchemy } from '../../lib/store'
import { Potje } from './Potje'

interface KastProps {
  ingredients: readonly Ingredient[] | undefined
  failed: boolean
  /** De foto-knop, die bij de bijzondere potjes staat */
  photo?: ReactNode
}

/** De planken vol potjes. Elk potje is een knop: erop drukken gooit het in de ketel */
export function Kast({ ingredients, failed, photo }: KastProps) {
  const items = useAlchemy((s) => s.cauldron.items)
  const count = (id: string) => items.filter((item) => item === id).length
  const colours = ingredients?.filter((i) => !isSpecial(i)) ?? []
  const special = ingredients?.filter(isSpecial) ?? []

  return (
    <section className="kast" aria-labelledby="kast-kop">
      <h2 id="kast-kop" className="kast-kop">
        {strings.kast.kop}
      </h2>
      {failed && <p className="kast-mislukt hand">{strings.kast.mislukt}</p>}
      {!ingredients && !failed && (
        <ul className="kast-planken" aria-busy="true" aria-label={strings.kast.wachten}>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <span className="potje-knop" data-wachten="true" />
            </li>
          ))}
        </ul>
      )}
      {ingredients && (
        <>
          <ul className="kast-planken">
            {colours.map((ingredient) => (
              <li key={ingredient.id} className="potje-plek">
                <Jar ingredient={ingredient} count={count(ingredient.id)} />
                <Badge ingredient={ingredient} count={count(ingredient.id)} />
              </li>
            ))}
          </ul>
          <h3 className="kast-sub">{strings.kast.bijzonder}</h3>
          <ul className="kast-planken" data-bijzonder="true">
            {special.map((ingredient) => (
              <li key={ingredient.id} className="potje-plek">
                <Jar ingredient={ingredient} count={count(ingredient.id)} />
                <Badge ingredient={ingredient} count={count(ingredient.id)} />
              </li>
            ))}
          </ul>
          {photo}
        </>
      )}
    </section>
  )
}

function Jar({ ingredient, count }: { ingredient: Ingredient; count: number }) {
  const label = `etiket-${ingredient.id}`
  return (
    <button type="button" className="potje-knop" aria-describedby={label} onClick={() => store.add(ingredient.id)}>
      <Potje ingredient={ingredient} className="potje" />
      {/* De naam is wat je ziet, met ervoor en erachter wat er gebeurt, alleen voor wie het hoort */}
      <span className="potje-naam" lang="nl">
        <span className="sr-only">{strings.kast.gooiVoor} </span>
        {ingredient.name}
        <span className="sr-only">
          {' '}
          {strings.kast.gooiNa}
          {count ? `, ${strings.kast.aantal(count)}` : ''}
        </span>
      </span>
      <span id={label} className="potje-etiket" aria-hidden="true">
        {ingredient.label}
      </span>
    </button>
  )
}

/** Het badge met hoe vaak een potje erin zit. Erop tikken haalt er één uit */
function Badge({ ingredient, count }: { ingredient: Ingredient; count: number }) {
  if (count === 0) return null
  return (
    <button type="button" className="potje-aantal" title={strings.kast.haalEruit(plainName(ingredient))} onClick={() => store.removeOne(ingredient.id)}>
      {count}×<span className="sr-only"> {strings.kast.haalEruitNa(plainName(ingredient))}</span>
    </button>
  )
}
