import { useSyncExternalStore } from 'react'
import { strings } from '../../content/strings'
import { sound } from '../../lib/sound'
import { Colofon } from './Colofon'
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
  const loud = useSyncExternalStore(sound.subscribe, sound.on)
  return (
    <header className="kop">
      <div className="kop-links">
        <h1 className="slip paper woordmerk">{strings.titel}</h1>
        <Colofon />
      </div>
      <div className="kop-schakelaars">
        {view && onView && (
          <button type="button" className="slip paper schakelaar kop-uitzicht" aria-label={view === 'plank' ? strings.uitzicht.naarKetelLang : strings.uitzicht.naarPlankLang} onClick={() => onView(view === 'plank' ? 'werkplaats' : 'plank')}>
            <span aria-hidden="true">{view === 'plank' ? '← ' : ''}</span>
            {view === 'plank' ? strings.uitzicht.naarKetel : strings.uitzicht.naarPlank}
            <span aria-hidden="true">{view === 'plank' ? '' : ' →'}</span>
          </button>
        )}
        {/* Geen geluid waar niemand om vroeg: het staat uit tot je het zelf aanzet */}
        <button type="button" role="switch" aria-checked={loud} aria-label={strings.geluid.label} className="slip paper schakelaar" onClick={() => sound.set(!loud)}>
          <span className="schakelaar-woord" data-aan={!loud}>
            {strings.geluid.uit}
          </span>
          <span className="schakelaar-streep" aria-hidden="true">
            /
          </span>
          <span className="schakelaar-woord" data-aan={loud}>
            {strings.geluid.aan}
          </span>
        </button>
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
