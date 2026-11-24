import { useMemo, useState } from 'react'
import { strings } from '../../content/strings'
import { confusions, simulate, VISIONS, type Vision } from '../../lib/alchemy/cvd'
import type { GoalId } from '../../lib/alchemy/ingredients'
import { roleNumber, type Swatch } from '../../lib/alchemy/palette'
import { Proefvel } from './Proefvel'

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Door de monocle: hoe het palet eruitziet bij kleurenblindheid, en welke rollen dan samenvallen */
export function Monocle({ swatches, goal }: { swatches: readonly Swatch[]; goal?: GoalId }) {
  const [vision, setVision] = useState<Vision | null>(null)
  const seen = useMemo(() => (vision ? swatches.map((s) => ({ ...s, hex: simulate(s.hex, vision) })) : null), [swatches, vision])
  const found = useMemo(() => (vision ? confusions(swatches, vision) : []), [swatches, vision])
  const name = (i: number) => strings.fles.rol(swatches[i].role, roleNumber(swatches, i), goal)

  return (
    <section className="monocle" aria-labelledby="monocle-kop">
      <h3 id="monocle-kop" className="toonbank-sub">
        {strings.monocle.kop}
      </h3>
      <p className="monocle-uitleg">{strings.monocle.uitleg}</p>
      <fieldset className="monocle-keuze">
        <legend className="sr-only">{strings.monocle.kop}</legend>
        {[null, ...VISIONS].map((v) => (
          <label key={v ?? 'gewoon'} className="monocle-optie">
            <input type="radio" name="monocle" checked={vision === v} onChange={() => setVision(v)} />
            <span>{v ? strings.monocle.namen[v] : strings.monocle.gewoon}</span>
          </label>
        ))}
      </fieldset>
      {vision && seen && (
        <div className="monocle-blik" aria-live="polite">
          <p className="monocle-wat hand">{strings.monocle.wat[vision]}</p>
          <ul className="snuifje-kleuren" aria-label={strings.monocle.namen[vision]}>
            {seen.map((s, i) => (
              <li key={i} style={{ background: s.hex }}>
                <span className="sr-only">
                  {name(i)} {s.hex}
                </span>
              </li>
            ))}
          </ul>
          <Proefvel swatches={seen} goal={goal} />
          {found.length === 0 ? (
            <p className="monocle-goed hand">{strings.monocle.goed}</p>
          ) : (
            <>
              <ul className="monocle-samen">
                {found.map((c) => (
                  <li key={`${c.a}-${c.b}`}>{capital(strings.monocle.samen(name(c.a), name(c.b)))}</li>
                ))}
              </ul>
              <p className="monocle-tip">{strings.monocle.tip}</p>
            </>
          )}
        </div>
      )}
    </section>
  )
}
