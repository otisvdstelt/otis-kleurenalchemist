import { strings } from '../../content/strings'
import type { Phase } from '../../lib/air'

interface HeaderProps {
  phase: Phase
  onPhase: (phase: Phase) => void
}

/** Bovenaan: de naam op een snipper, en het uur als twee woorden waarvan het ware onderstreept is */
export function Header({ phase, onPhase }: HeaderProps) {
  const dark = phase === 'night'
  return (
    <header className="kop">
      <h1 className="slip paper woordmerk">{strings.titel}</h1>
      <div className="kop-schakelaars">
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
