import { forwardRef, useEffect, useRef, useState } from 'react'
import { strings } from '../../content/strings'
import { ADJUSTMENTS } from '../../lib/alchemy/adjust'
import { roleNumber } from '../../lib/alchemy/palette'
import { encodeBottle } from '../../lib/alchemy/share'
import { store, useAlchemy } from '../../lib/store'
import { Contrastcheck } from './Contrastcheck'
import { Eerder } from './Eerder'
import { Fles } from './Fles'
import { Meenemen } from './Meenemen'
import { Monocle } from './Monocle'
import { Proefvel } from './Proefvel'

interface FlesjeProps {
  /** Met de werkplaats erbij ligt het flesje op een vel dat je weg kunt leggen */
  onClose?: () => void
}

/** Het laatst gevulde flesje: het palet, het etiket, het proefvel en de contrastcheck */
export const Flesje = forwardRef<HTMLElement, FlesjeProps>(function Flesje({ onClose }, ref) {
  const flask = useAlchemy((s) => s.flask)
  const corks = useAlchemy((s) => s.cauldron.corks)
  const size = useAlchemy((s) => s.cauldron.size)
  const hasContrast = useAlchemy((s) => s.cauldron.items.includes('contrast'))
  const shelf = useAlchemy((s) => s.shelf)
  const [copied, setCopied] = useState<{ index: number; ok: boolean } | null>(null)
  const [tuning, setTuning] = useState<number | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!flask) {
    return (
      <section ref={ref} className="toonbank" aria-labelledby="fles-kop" tabIndex={-1}>
        <h2 id="fles-kop" className="toonbank-kop">
          {strings.fles.kop}
        </h2>
        <p className="toonbank-leeg slip paper hand">{strings.fles.leeg}</p>
        <Eerder />
      </section>
    )
  }

  const { bottle, brew, from } = flask
  const swatches = bottle.swatches
  // Kurken horen bij de ketel. Ze kunnen alleen op een flesje dat net uit de ketel komt, en even groot is
  const corkable = from === 'ketel' && swatches.length === size
  const code = encodeBottle(bottle)
  const onShelf = shelf.some((b) => encodeBottle(b) === code)

  const copy = async (index: number) => {
    const hex = swatches[index].hex
    let ok = true
    try {
      await navigator.clipboard.writeText(hex)
    } catch {
      ok = false
    }
    setCopied({ index, ok })
    store.say(ok ? `${hex} ${strings.fles.gekopieerd}` : strings.fles.nietGekopieerd)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(null), 1600)
  }

  const again = () => {
    store.reroll()
    store.pour()
  }

  const pinch = () => {
    store.add('contrast')
    store.pour()
  }

  return (
    <section ref={ref} className="toonbank" aria-labelledby="fles-kop" tabIndex={-1}>
      <div className="toonbank-boven">
        <h2 id="fles-kop" className="toonbank-kop">
          {strings.fles.kop}
        </h2>
        {onClose && (
          <button type="button" className="quiet" onClick={onClose}>
            {strings.fles.wegzetten}
          </button>
        )}
      </div>

      {from === 'link' && (
        <div className="welkom slip paper">
          <p className="welkom-kop hand">{strings.delen.welkom}</p>
          <p className="welkom-uitleg">{strings.delen.welkomUitleg}</p>
          <div className="welkom-knoppen">
            {onShelf ? (
              <span className="hand toonbank-opplank">{strings.plank.staatErop}</span>
            ) : (
              <button type="button" className="inked" data-tone="rust" onClick={() => store.shelve(bottle)}>
                {strings.delen.welkomPlank}
              </button>
            )}
            <button type="button" className="inked" onClick={() => store.continueFrom(bottle)}>
              {strings.delen.welkomVerder}
            </button>
          </div>
        </div>
      )}

      <div className="flesje">
        <Fles swatches={swatches} pourKey={`${bottle.recipe.seed}-${bottle.name}`} className="flesje-glas" />
        <p className="flesje-etiket tag">
          <span className="flesje-naam">{bottle.name}</span>
          <span className="tag-note">{new Date(`${bottle.date}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </p>
      </div>
      {brew?.mud && <p className="toonbank-modder hand">{strings.fles.modder}</p>}

      <ul className="stalen">
        {swatches.map((s, i) => {
          const n = roleNumber(swatches, i)
          const corked = corkable && corks[i] === s.hex
          return (
            <li key={i} className="staal">
              <button type="button" className="staal-kleur" style={{ background: s.hex }} aria-label={strings.fles.kopieer(s.hex)} onClick={() => void copy(i)} />
              <span className="staal-rol hand">{strings.fles.rol(s.role, n)}</span>
              <code className="staal-hex">{s.hex}</code>
              <span className="staal-knoppen">
                {corkable && (
                  <button type="button" className="staal-kurk" aria-pressed={corked} title={strings.fles.kurkUitleg} onClick={() => store.cork(i, corked ? null : s.hex)}>
                    {corked ? strings.fles.kurkEraf : strings.fles.kurk}
                  </button>
                )}
                <button type="button" className="staal-kurk" aria-expanded={tuning === i} aria-controls={`bijstellen-${i}`} onClick={() => setTuning(tuning === i ? null : i)}>
                  {tuning === i ? strings.bijstellen.dicht : strings.bijstellen.knop}
                </button>
              </span>
              {tuning === i && (
                <div id={`bijstellen-${i}`} className="bijstellen" role="group" aria-label={`${strings.bijstellen.knop}: ${strings.fles.rol(s.role, n)}`}>
                  <div className="bijstellen-stappen">
                    {ADJUSTMENTS.map((how) => (
                      <button key={how} type="button" className="quiet" onClick={() => store.adjust(i, how)}>
                        {strings.bijstellen[how]}
                      </button>
                    ))}
                  </div>
                  <label className="bijstellen-rol">
                    <span className="hand">{strings.bijstellen.rol}</span>
                    <select
                      value={i}
                      onChange={(event) => {
                        const to = Number(event.target.value)
                        store.swap(i, to)
                        setTuning(to)
                      }}
                    >
                      {swatches.map((other, j) => (
                        <option key={j} value={j}>
                          {j === i ? `${strings.fles.rol(other.role, roleNumber(swatches, j))} (${strings.bijstellen.houd})` : strings.bijstellen.wissel(strings.fles.rol(other.role, roleNumber(swatches, j)))}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
              {copied?.index === i && (
                <span className="staal-bevestiging tag" aria-hidden="true">
                  {copied.ok ? strings.fles.gekopieerd : strings.fles.nietGekopieerd}
                </span>
              )}
            </li>
          )
        })}
      </ul>
      {corkable && (
        <button type="button" className="inked toonbank-opnieuw" onClick={again}>
          {strings.fles.roerOpnieuw}
        </button>
      )}

      {from !== 'link' && <div className="toonbank-acties">
        {onShelf ? (
          <span className="hand toonbank-opplank">{strings.plank.staatErop}</span>
        ) : (
          <button type="button" className="inked" data-tone="rust" onClick={() => store.shelve(bottle)}>
            {strings.plank.zetErop}
          </button>
        )}
        {from !== 'ketel' && (
          <button type="button" className="inked" onClick={() => store.continueFrom(bottle)}>
            {strings.delen.verder}
          </button>
        )}
      </div>}

      <h3 className="toonbank-sub">{strings.proefvel.kop}</h3>
      <Proefvel swatches={swatches} />

      <Contrastcheck flask={flask} pinched={hasContrast || from !== 'ketel'} onPinch={pinch} />

      <Monocle swatches={swatches} />

      <Meenemen bottle={bottle} />

      <Eerder />
    </section>
  )
})
