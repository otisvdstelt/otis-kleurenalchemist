import { forwardRef, useEffect, useRef, useState } from 'react'
import { strings } from '../../content/strings'
import { roleNumber } from '../../lib/alchemy/palette'
import { store, useAlchemy } from '../../lib/store'
import { Contrastcheck } from './Contrastcheck'
import { Fles } from './Fles'
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
  const [copied, setCopied] = useState<{ index: number; ok: boolean } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!flask) {
    return (
      <section ref={ref} className="toonbank" aria-labelledby="fles-kop" tabIndex={-1}>
        <h2 id="fles-kop" className="toonbank-kop">
          {strings.fles.kop}
        </h2>
        <p className="toonbank-leeg slip paper hand">{strings.fles.leeg}</p>
      </section>
    )
  }

  const { bottle, brew } = flask
  const swatches = bottle.swatches
  // Kurken horen bij de ketel. Ze kunnen alleen op een flesje dat even groot is als wat er nu gebrouwen wordt
  const corkable = swatches.length === size

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
    store.stir(1)
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

      <div className="flesje">
        <Fles swatches={swatches} pourKey={`${bottle.recipe.seed}-${bottle.name}`} className="flesje-glas" />
        <p className="flesje-etiket tag">
          <span className="flesje-naam">{bottle.name}</span>
          <span className="tag-note">{new Date(`${bottle.date}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </p>
      </div>
      {brew.mud && <p className="toonbank-modder hand">{strings.fles.modder}</p>}

      <ul className="stalen">
        {swatches.map((s, i) => {
          const n = roleNumber(swatches, i)
          const corked = corkable && corks[i] === s.hex
          return (
            <li key={i} className="staal">
              <button type="button" className="staal-kleur" style={{ background: s.hex }} aria-label={strings.fles.kopieer(s.hex)} onClick={() => void copy(i)} />
              <span className="staal-rol hand">{strings.fles.rol(s.role, n)}</span>
              <code className="staal-hex">{s.hex}</code>
              {corkable && (
                <button type="button" className="staal-kurk" aria-pressed={corked} title={strings.fles.kurkUitleg} onClick={() => store.cork(i, corked ? null : s.hex)}>
                  {corked ? strings.fles.kurkEraf : strings.fles.kurk}
                </button>
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

      <h3 className="toonbank-sub">{strings.proefvel.kop}</h3>
      <Proefvel swatches={swatches} />

      <Contrastcheck flask={flask} pinched={hasContrast} onPinch={pinch} />
    </section>
  )
})
