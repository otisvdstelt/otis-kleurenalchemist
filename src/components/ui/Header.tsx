import { strings } from '../../content/strings'
import type { Phase } from '../../lib/air'

interface HeaderProps {
  phase: Phase
  onPhase: (phase: Phase) => void
  /** Met de werkplaats erbij: bij de ketel of bij de plank, en de weg ernaartoe */
  view?: 'werkplaats' | 'plank'
  onView?: (view: 'werkplaats' | 'plank') => void
}

/** Bovenaan: de naam op een snipper, en het uur als twee woorden waarvan het ware onderstreept is */
export function Header({ phase, onPhase, view, onView }: HeaderProps) {
  const dark = phase === 'night'
  return (
    <header className="kop">
      <h1 className="slip paper woordmerk">{strings.titel}</h1>
      <div className="kop-schakelaars">
        {view && onView && (
          <button type="button" className="slip paper schakelaar kop-uitzicht" onClick={() => onView(view === 'plank' ? 'werkplaats' : 'plank')}>
            {view === 'plank' ? strings.uitzicht.naarKetel : strings.uitzicht.naarPlank}
          </button>
        )}
        <button type="button" role="switch" aria-checked={dark} aria-label={strings.uur.label} className="slip paper schakelaar" onClick={() => onPhase(dark ? 'day' : 'night')}>
          <span className="schakelaar-woord" data-aan={!dark}>
            {strings.uur.dag}
          </span>
          <span className="schakelaar-streep" aria-hidden="true">
            /
          </span>
          <span className="schakelaar-woord" data-aan={dark}>
            {strings.uur.nacht}
          </span>
        </button>
      </div>
    </header>
  )
}
