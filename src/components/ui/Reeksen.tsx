import { useEffect, useState } from 'react'
import { strings } from '../../content/strings'
import type { Ramp } from '../../lib/alchemy/palette'
import { STEPS } from '../../lib/alchemy/palette'
import { store } from '../../lib/store'

const TUNES = ['warmer', 'koeler', 'feller', 'doffer'] as const

/** De reeksen van 50 tot 950, als stroken. Tik op een stap om de hexwaarde te kopiëren */
export function Reeksen({ ramps, editable }: { ramps: readonly Ramp[]; editable: boolean }) {
  const [copied, setCopied] = useState<string | null>(null)
  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(null), 1400)
    return () => window.clearTimeout(timer)
  }, [copied])
  if (ramps.length === 0) return null

  const copy = async (hex: string, label: string) => {
    let ok = true
    try {
      await navigator.clipboard.writeText(hex)
    } catch {
      ok = false
    }
    setCopied(ok ? label : null)
    store.say(ok ? `${label}: ${hex} ${strings.fles.gekopieerd}` : strings.fles.nietGekopieerd)
  }

  return (
    <section className="reeksen" aria-labelledby="reeksen-kop">
      <h3 id="reeksen-kop" className="toonbank-sub">
        {strings.reeksen.kop}
      </h3>
      {ramps.map((ramp, r) => (
        <div key={ramp.name} className="reeks">
          <p className="reeks-naam hand">{strings.reeksen.namen[ramp.name]}</p>
          <ol className="reeks-strook">
            {ramp.steps.map((hex, i) => {
              const label = `${ramp.name}-${STEPS[i]}`
              return (
                <li key={i}>
                  <button type="button" className="reeks-stap" style={{ background: hex }} aria-label={strings.reeksen.kopieer(label, hex)} title={`${label} ${hex}`} onClick={() => void copy(hex, label)}>
                    {copied === label && <span className="reeks-gekopieerd tag">{strings.fles.gekopieerd}</span>}
                  </button>
                  <span className="reeks-stapnaam" aria-hidden="true">
                    {STEPS[i]}
                  </span>
                </li>
              )
            })}
          </ol>
          {editable && (
            <div className="reeks-bijstellen" role="group" aria-label={strings.reeksen.bijstellen(strings.reeksen.namen[ramp.name])}>
              {TUNES.map((how) => (
                <button key={how} type="button" className="quiet" onClick={() => store.adjustRamp(r, how)}>
                  {strings.bijstellen[how]}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </section>
  )
}
