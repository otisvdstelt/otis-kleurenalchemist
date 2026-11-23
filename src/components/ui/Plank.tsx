import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { strings } from '../../content/strings'
import type { Bottle } from '../../lib/alchemy/bottle'
import { encodeShelf } from '../../lib/alchemy/share'
import { store, useAlchemy } from '../../lib/store'
import { Fles } from './Fles'
import { ZelfKopieren } from './ZelfKopieren'

/** De plank met flesjes. Je pakt er een af om te bekijken, je verplaatst ze met de muis of het toetsenbord, en je deelt de hele plank */
export function Plank({ onOpen }: { onOpen: () => void }) {
  const shelf = useAlchemy((s) => s.shelf)
  const visiting = useAlchemy((s) => s.visiting)
  const removed = useAlchemy((s) => s.removed)
  const [fallback, setFallback] = useState<string | null>(null)

  // Terugzetten kan even, daarna is het weg
  useEffect(() => {
    if (!removed) return
    const timer = window.setTimeout(() => store.forgetRemoved(), 10_000)
    return () => window.clearTimeout(timer)
  }, [removed])
  const [moving, setMoving] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const grips = useRef<(HTMLButtonElement | null)[]>([])
  const items = useRef<(HTMLLIElement | null)[]>([])
  const dragging = useRef<number | null>(null)

  // Na een verplaatsing blijft de focus op het flesje dat je vasthoudt
  useEffect(() => {
    if (moving !== null) grips.current[moving]?.focus()
  }, [moving, shelf])

  const open = (bottle: Bottle) => {
    store.open(bottle, 'plank')
    onOpen()
  }

  const onGripKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const bottle = shelf[index]
    if (moving === index) {
      const step = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0
      if (step) {
        event.preventDefault()
        const to = Math.max(0, Math.min(shelf.length - 1, index + step))
        if (to !== index) {
          store.move(index, to)
          setMoving(to)
        }
        return
      }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') {
        event.preventDefault()
        setMoving(null)
        store.say(strings.plank.neergezet(bottle.name))
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setMoving(index)
      store.say(strings.plank.opgepakt(bottle.name))
    }
  }

  // Met de muis of een vinger: vastpakken aan de greep en schuiven
  const onGripDown = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragging.current = index
  }
  const onGripMove = (event: PointerEvent<HTMLButtonElement>) => {
    const from = dragging.current
    if (from === null) return
    let best = from
    let bestDistance = Infinity
    items.current.forEach((item, i) => {
      if (!item) return
      const box = item.getBoundingClientRect()
      const d = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2))
      if (d < bestDistance) {
        bestDistance = d
        best = i
      }
    })
    if (best !== from) {
      store.move(from, best)
      dragging.current = best
    }
  }
  const onGripUp = () => {
    dragging.current = null
  }

  const share = async () => {
    const link = `${window.location.origin}/plank/${encodeShelf(shelf)}`
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setFallback(null)
      store.say(strings.nieuws.gekopieerd(strings.plank.deel))
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // Mag het klembord niet, dan staat de link er om zelf te kopiëren
      setFallback(link)
      store.say(strings.delen.zelfKopieren)
    }
  }

  return (
    <section className="plank" aria-labelledby="plank-kop">
      <div className="plank-boven">
        <h2 id="plank-kop" className="plank-kop">
          {strings.plank.kop}
        </h2>
        {shelf.length > 0 && (
          <button type="button" className="quiet plank-deel" onClick={() => void share()}>
            {strings.plank.deel}
          </button>
        )}
        {copied && (
          <span className="tag plank-bevestiging" aria-hidden="true">
            {strings.fles.gekopieerd}
          </span>
        )}
      </div>

      {fallback && <ZelfKopieren link={fallback} />}

      {removed && (
        <p className="plank-weggehaald slip paper" role="status">
          <span className="hand">{strings.plank.weggehaald(removed.bottle.name)}</span>{' '}
          <button type="button" className="inked" onClick={() => store.restore()}>
            {strings.plank.terugzetten}
          </button>
        </p>
      )}

      {visiting && (
        <div className="plank-bezoek slip paper">
          <p className="hand">{strings.plank.bezoekKop}</p>
          <ol className="plank-rij">
            {visiting.map((bottle, i) => (
              <li key={i} className="plank-item">
                <button type="button" className="plank-fles" onClick={() => open(bottle)}>
                  <Fles swatches={bottle.swatches} pourKey="bezoek" className="plank-glas" />
                  <span className="plank-naam hand">{bottle.name}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="plank-knoppen">
            <button type="button" className="inked" onClick={() => store.leaveVisit(true)}>
              {strings.plank.overnemen}
            </button>
            <button type="button" className="quiet" onClick={() => store.leaveVisit(false)}>
              {strings.plank.laten}
            </button>
          </div>
        </div>
      )}

      {shelf.length === 0 ? (
        <p className="plank-leeg hand">{strings.plank.leeg}</p>
      ) : (
        <>
          <ol className="plank-rij" aria-describedby="plank-uitleg">
            {shelf.map((bottle, i) => (
              <li key={`${bottle.name}-${bottle.recipe.seed}-${bottle.date}`} ref={(el) => void (items.current[i] = el)} className="plank-item" data-vast={moving === i}>
                <button type="button" className="plank-fles" aria-label={strings.plank.open(bottle.name)} onClick={() => open(bottle)}>
                  <Fles swatches={bottle.swatches} pourKey="plank" className="plank-glas" />
                  <span className="plank-naam hand" aria-hidden="true">
                    {bottle.name}
                  </span>
                </button>
                <span className="plank-handjes">
                  <button
                    type="button"
                    ref={(el) => void (grips.current[i] = el)}
                    className="plank-greep"
                    aria-label={strings.plank.verplaats(bottle.name)}
                    aria-pressed={moving === i}
                    onKeyDown={(event) => onGripKey(event, i)}
                    onPointerDown={(event) => onGripDown(event, i)}
                    onPointerMove={onGripMove}
                    onPointerUp={onGripUp}
                    onPointerCancel={onGripUp}
                  >
                    <span aria-hidden="true">⠿</span>
                  </button>
                  <button type="button" className="quiet plank-weg" onClick={() => store.unshelve(i)}>
                    {strings.plank.weg}
                  </button>
                </span>
              </li>
            ))}
          </ol>
          <p id="plank-uitleg" className="sr-only">
            {strings.plank.verplaatsUitleg}
          </p>
        </>
      )}
    </section>
  )
}
