import { useState, type ReactNode } from 'react'
import { strings } from '../../content/strings'
import { plainName, type Ingredient } from '../../lib/alchemy/ingredients'
import { store, useAlchemy } from '../../lib/store'
import { Potje } from './Potje'

type Shelf = 'basis' | 'doel' | 'smaak' | 'kruiden'
const SHELVES: readonly Shelf[] = ['basis', 'doel', 'smaak', 'kruiden']

interface KastProps {
  ingredients: readonly Ingredient[] | undefined
  failed: boolean
  /** De lege kolf voor je eigen kleur, met de pipet */
  kolf: ReactNode
}

/**
 * De kast met vier planken: basis, doel, smaak en kruiden. Op een breed scherm staan ze onder elkaar,
 * op een telefoon kies je er een met de tabjes boven de strook
 */
export function Kast({ ingredients, failed, kolf }: KastProps) {
  const items = useAlchemy((s) => s.cauldron.items)
  const goal = useAlchemy((s) => s.cauldron.goal)
  const [open, setOpen] = useState<Shelf>('smaak')
  const count = (id: string) => items.filter((item) => item === id).length
  const of = (kind: Ingredient['kind']) => ingredients?.filter((i) => i.kind === kind) ?? []

  const shelf = (key: Shelf, content: ReactNode) => (
    <section key={key} className="kast-plank" data-open={open === key} aria-labelledby={`plank-${key}`}>
      <h3 id={`plank-${key}`} className="kast-sub">
        {strings.kast.planken[key]}
        <span className="kast-uitleg">{strings.kast.plankUitleg[key]}</span>
      </h3>
      {content}
    </section>
  )

  return (
    <section className="kast" aria-labelledby="kast-kop">
      <h2 id="kast-kop" className="kast-kop">
        {strings.kast.kop}
      </h2>
      {/* Op een telefoon: welke plank je ziet */}
      <div className="kast-tabjes">
        {SHELVES.map((key) => (
          <button key={key} type="button" className="kast-tabje" aria-pressed={open === key} onClick={() => setOpen(key)}>
            {strings.kast.planken[key]}
          </button>
        ))}
      </div>
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
          {shelf('basis', kolf)}
          {shelf(
            'doel',
            <fieldset className="doelen">
              <legend className="sr-only">{strings.kast.planken.doel}</legend>
              {of('doel').map((ingredient) => (
                <label key={ingredient.id} className="doel">
                  <input type="radio" name="doel" value={ingredient.id} checked={goal === ingredient.goal} onChange={() => ingredient.goal && store.setGoal(ingredient.goal)} />
                  <span className="potje-knop doel-kaart">
                    <Potje ingredient={ingredient} className="potje" />
                    <span className="potje-naam" lang="nl">
                      {ingredient.name}
                    </span>
                    <span className="potje-etiket">{ingredient.label}</span>
                  </span>
                </label>
              ))}
            </fieldset>,
          )}
          {shelf('smaak', <Jars list={of('smaak')} count={count} />)}
          {shelf('kruiden', <Jars list={[...of('harmonie'), ...of('bewerking')]} count={count} />)}
        </>
      )}
    </section>
  )
}

function Jars({ list, count }: { list: readonly Ingredient[]; count: (id: string) => number }) {
  return (
    <ul className="kast-planken">
      {list.map((ingredient) => (
        <li key={ingredient.id} className="potje-plek">
          <Jar ingredient={ingredient} count={count(ingredient.id)} />
          <Badge ingredient={ingredient} count={count(ingredient.id)} />
        </li>
      ))}
    </ul>
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
      <span id={label} className="potje-etiket">
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
