import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { strings } from '../../content/strings'
import { MAX_SIZE, MIN_SIZE } from '../../lib/alchemy/palette'
import { boilState } from '../../lib/alchemy/mix'
import { isSpecial } from '../../lib/alchemy/ingredients'
import { currentIngredients, store, useAlchemy, useBrew } from '../../lib/store'
import type { CauldronOnScreen } from '../World'
import { KetelTekening } from './KetelTekening'

interface KetelProps {
  /** Er is net een flesje gevuld */
  onPoured: () => void
  /** Waar de ketel in de werkplaats op het scherm staat. Zonder 3D is er een getekende ketel */
  onScreen?: CauldronOnScreen | null
}

const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i)

/** De ketel op het vuur, met alles wat je ermee kunt: roeren, afscheppen, leegmaken en bottelen */
export function Ketel({ onPoured, onScreen }: KetelProps) {
  const drawn = onScreen === undefined
  const brew = useBrew()
  const cauldron = useAlchemy((s) => s.cauldron)
  const stirredAt = useAlchemy((s) => s.stir.at)
  const inside = useAlchemy(currentIngredients)
  const boil = boilState(inside.filter((i) => !isSpecial(i)).length)
  const fast = useRecent(stirredAt, 1400)
  const circling = useRef<{ angle: number; turned: number } | null>(null)
  // De eerste keer dat er iets in de ketel zit, staat erbij hoe je roert. Na de eerste slag nooit meer
  const [hintedBefore] = useState(readHinted)
  const showHint = !hintedBefore && stirredAt === 0 && brew !== null
  useEffect(() => {
    if (!stirredAt || hintedBefore) return
    try {
      window.localStorage.setItem(HINT_KEY, '1')
    } catch {
      // Dan komt de hint de volgende keer nog een keer
    }
  }, [stirredAt, hintedBefore])

  const pour = () => {
    if (store.pour()) onPoured()
  }

  // Rondjes slepen boven de ketel is roeren: elk heel rondje is één slag
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!brew) return
    event.currentTarget.setPointerCapture(event.pointerId)
    circling.current = { angle: angleOf(event), turned: 0 }
  }
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const circle = circling.current
    if (!circle) return
    const angle = angleOf(event)
    let delta = angle - circle.angle
    if (delta > Math.PI) delta -= Math.PI * 2
    if (delta < -Math.PI) delta += Math.PI * 2
    circle.angle = angle
    circle.turned += delta
    if (Math.abs(circle.turned) >= Math.PI * 2) {
      circle.turned -= Math.sign(circle.turned) * Math.PI * 2
      store.stir(1)
    }
  }
  const onPointerUp = () => {
    circling.current = null
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === ' ' || event.key.startsWith('Arrow')) {
      event.preventDefault()
      store.stir(1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pour()
    }
  }

  return (
    <section className="haard" aria-labelledby="ketel-kop">
      <h2 id="ketel-kop" className="sr-only">
        {strings.ketel.kop}
      </h2>
      <p className="haard-toestand hand" data-boil={boil}>
        {inside.length === 0 ? strings.ketel.leeg : strings.ketel.toestand[boil]}
        {inside.length > 0 && (
          <span className="haard-slagen">
            {' '}
            {strings.ketel.slagen(cauldron.stirs)}, {strings.ketel.glad(brew?.homogeneity ?? 0)}
          </span>
        )}
      </p>

      {/* Met de werkplaats erbij ligt dit vlak precies over de ketel in 3D: daar roer je, en daar komt het toetsenbord */}
      {(drawn || onScreen) && (
        <div
          className="ketel"
          data-wereld={!drawn}
          style={onScreen ? { left: onScreen.x - onScreen.rx * 1.15, top: onScreen.y - onScreen.ry * 2.2, width: onScreen.rx * 2.3, height: onScreen.ry * 4 } : undefined}
          tabIndex={0}
          role="group"
          aria-label={strings.ketel.uitleg}
          onKeyDown={onKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          data-leeg={!brew}
        >
          {drawn && <KetelTekening brew={brew} boil={boil} fast={fast} />}
          {showHint && (
            <p className="roer-hint tag" aria-hidden="true">
              {strings.ketel.roerHint}
              <span className="tag-note">{strings.ketel.roerHintToetsen}</span>
            </p>
          )}
        </div>
      )}

      {brew && (
        <ul className="damp" aria-label={strings.ketel.damp}>
          {brew.swatches.map((s, i) => (
            <li key={i} className="damp-vlek" style={{ background: s.hex }}>
              <span className="sr-only">{s.hex}</span>
            </li>
          ))}
        </ul>
      )}

      {inside.length > 0 && (
        <div className="inhoud">
          <h3 className="inhoud-kop hand">{strings.ketel.inhoud}</h3>
          <ol className="inhoud-lijst">
            {inside.map((ingredient, i) => (
              <li key={i} className="inhoud-item hand">
                {ingredient.name}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="haard-knoppen">
        <button type="button" className="inked" disabled={!brew} onClick={() => store.stir(1)}>
          {strings.ketel.roer}
        </button>
        <button type="button" className="quiet" disabled={inside.length === 0} onClick={() => store.skim()}>
          {strings.ketel.afscheppen}
        </button>
        <button type="button" className="quiet" disabled={inside.length === 0} onClick={() => store.empty()}>
          {strings.ketel.legen}
        </button>
      </div>

      <fieldset className="grootte">
        <legend className="hand">{strings.ketel.grootte}</legend>
        <div className="grootte-keuzes">
          {SIZES.map((n) => (
            <label key={n} className="grootte-keuze">
              <input type="radio" name="grootte" value={n} checked={cauldron.size === n} onChange={() => store.size(n)} />
              <span>{n}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <button type="button" className="plaque haard-bottel" disabled={!brew} onClick={pour}>
        {strings.ketel.bottelen}
      </button>
    </section>
  )
}

const HINT_KEY = 'kleurenalchemist-geroerd'
function readHinted(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1'
  } catch {
    return false
  }
}

function angleOf(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect()
  return Math.atan2(event.clientY - (box.top + box.height * 0.4), event.clientX - (box.left + box.width / 2))
}

/** Waar zolang er minder dan `ms` voorbij is sinds `at` */
function useRecent(at: number, ms: number) {
  // Het moment dat al is uitgewerkt. Zolang `at` nieuwer is, is het recent
  const [settled, setSettled] = useState(0)
  useEffect(() => {
    if (!at) return
    const timer = window.setTimeout(() => setSettled(at), ms)
    return () => window.clearTimeout(timer)
  }, [at, ms])
  return at > settled
}
