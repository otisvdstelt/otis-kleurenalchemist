import { useIsFetching } from '@tanstack/react-query'
import { useEffect, useLayoutEffect, useState, useSyncExternalStore, type CSSProperties } from 'react'
import { strings } from '../../content/strings'
import { progress } from '../../lib/progress'

/** De Suspense-fallback. Hij tekent niets en zegt het kolfje alleen dat het moet blijven borrelen */
export function Borrelend() {
  useLayoutEffect(() => progress.hold(), [])
  return null
}

/** Een klein kolfje in de hoek dat borrelt zolang er iets wordt opgehaald */
export function Kolfje() {
  const pending = useSyncExternalStore(progress.subscribe, progress.pending)
  const fetching = useIsFetching() > 0
  const busy = pending || fetching
  // Blijf nog even staan als het klaar is, lang genoeg om het af te zien lopen
  const [shown, setShown] = useState(busy)
  if (busy && !shown) setShown(true)

  useEffect(() => {
    if (busy) return
    const timer = window.setTimeout(() => setShown(false), 1300)
    return () => window.clearTimeout(timer)
  }, [busy])

  return shown ? <Flask done={!busy} /> : null
}

const BUBBLES = [
  { cx: 70, cy: 150, r: 5, at: 0, drift: '-4px' },
  { cx: 88, cy: 158, r: 3.5, at: 0.35, drift: '3px' },
  { cx: 80, cy: 146, r: 4.2, at: 0.62, drift: '-1px' },
  { cx: 94, cy: 150, r: 2.8, at: 0.85, drift: '5px' },
]

function Flask({ done }: { done: boolean }) {
  // Eerst leeg getekend, zodat het volgende frame iets heeft om te vullen
  const [filling, setFilling] = useState(false)
  useEffect(() => {
    const frame = requestAnimationFrame(() => setFilling(true))
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <div className="kolfje" data-filling={filling} data-done={done} role="status" aria-live="polite">
      <svg viewBox="0 0 160 200" aria-hidden="true">
        {/* De natte kring waar hij op staat */}
        <ellipse cx="80" cy="188" rx="50" ry="9" fill="#8c5f3e" opacity="0.25" filter="url(#bleed)" />
        {/* Damp uit de hals */}
        <g filter="url(#wobble)" fill="none" stroke="#a3c1ad" strokeWidth="3.5" strokeLinecap="round">
          <path className="kolfje-damp" pathLength={1} d="M76 40c-8-8 6-14-2-24" />
          <path className="kolfje-damp" pathLength={1} style={{ animationDelay: '1.1s' }} d="M86 44c8-9-5-15 3-26" />
        </g>
        {/* De vloeistof, die stijgt naarmate er meer binnen is */}
        <g filter="url(#bleed)" opacity="0.45">
          <path className="kolfje-vloeistof" d="M42 132h76l16 30a14 14 0 0 1-12.5 20h-83A14 14 0 0 1 26 162Z" fill="#b8623b" />
        </g>
        <g filter="url(#wobble)">
          <path className="kolfje-vloeistof" d="M42 132h76l16 30a14 14 0 0 1-12.5 20h-83A14 14 0 0 1 26 162Z" fill="#b8623b" fillOpacity="0.85" />
          {BUBBLES.map(({ cx, cy, r, at, drift }) => (
            <circle key={at} className="kolfje-bel" style={{ '--at': at, '--drift': drift } as CSSProperties} cx={cx} cy={cy} r={r} fill="#fcfaf3" />
          ))}
          {/* Het glas: een kolf met een lange hals en een kraag */}
          <path d="M62 52h36M66 54v46L24 168a14 14 0 0 0 12.4 20h87.2A14 14 0 0 0 136 168L94 100V54" fill="none" stroke="#2c2823" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M42 150c-4 6-6 12-5 18" fill="none" stroke="#fcfaf3" strokeOpacity="0.7" strokeWidth="3.5" strokeLinecap="round" />
        </g>
      </svg>
      <span className="sr-only">{done ? strings.laden.klaar : strings.laden.bezig}</span>
    </div>
  )
}
