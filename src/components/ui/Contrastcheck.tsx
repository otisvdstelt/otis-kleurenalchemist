import { strings } from '../../content/strings'
import { checkPalette, formatRatio } from '../../lib/alchemy/contrast'
import { roleNumber, type Swatch } from '../../lib/alchemy/palette'
import type { Flask } from '../../lib/store'

interface ContrastcheckProps {
  flask: Flask
  /** Of er al contrast in de ketel zit */
  pinched: boolean
  onPinch: () => void
}

const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const roleName = (swatches: readonly Swatch[], index: number) => strings.fles.rol(swatches[index].role, roleNumber(swatches, index))

/** Is het leesbaar? Elk paar dat ertoe doet, in een getal én in gewone woorden */
export function Contrastcheck({ flask, pinched, onPinch }: ContrastcheckProps) {
  const swatches = flask.bottle.swatches
  const checks = checkPalette(swatches)
  const weak = checks.filter((c) => !c.passes)
  const pinch = flask.brew?.pinch

  return (
    <section className="contrast" aria-labelledby="contrast-kop">
      <h3 id="contrast-kop" className="contrast-kop">
        {strings.contrast.kop}
      </h3>
      <p className="contrast-samen hand" data-goed={weak.length === 0}>
        {weak.length === 0 ? strings.contrast.alles : strings.contrast.niet(weak.length)}
      </p>
      {weak.length > 0 && !pinched && (
        <div className="contrast-tip">
          <p>{strings.contrast.snuifjeTip}</p>
          <button type="button" className="inked" onClick={onPinch}>
            {strings.contrast.snuifje}
          </button>
        </div>
      )}
      {pinch && pinch.unreachable.length > 0 && <p className="contrast-tip">{strings.contrast.onbereikbaar}</p>}

      {pinch && pinch.changed.length > 0 && (
        <div className="snuifje">
          {[
            [strings.contrast.voor, pinch.before],
            [strings.contrast.na, swatches],
          ].map(([label, row]) => (
            <div key={label as string} className="snuifje-rij">
              <span className="hand">{label as string}</span>
              <ul className="snuifje-kleuren">
                {(row as readonly Swatch[]).map((s, i) => (
                  <li key={i} style={{ background: s.hex }} data-veranderd={pinch.changed.includes(i)}>
                    <span className="sr-only">
                      {roleName(swatches, i)} {s.hex}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <ul className="checks">
        {checks.map((check) => {
          const fg = swatches[check.fg]
          const bg = swatches[check.bg]
          return (
            <li key={`${check.fg}-${check.bg}`} className="check" data-goed={check.passes}>
              <span className="check-monster" style={{ background: bg.hex, color: fg.hex }} aria-hidden="true">
                {check.kind === 'tekst' ? 'Aa' : <span className="check-blok" style={{ background: fg.hex }} />}
              </span>
              <div className="check-woorden">
                <p className="check-paar">
                  <b>{capital(strings.contrast.paar(roleName(swatches, check.fg), roleName(swatches, check.bg)))}</b>{' '}
                  <span className="check-getal">{formatRatio(check.ratio)}</span> <span className="check-niveau">{strings.contrast.niveau[check.level]}</span>
                </p>
                <p className="check-zin">{check.kind === 'tekst' ? strings.contrast.tekst[check.level] : strings.contrast.onderdeel[check.level]}</p>
                <p className="check-klein">
                  {strings.contrast.nodig(formatRatio(check.required))} · {strings.contrast.apca} Lc {Math.round(Math.abs(check.lc))}
                  <span aria-hidden="true">*</span>
                </p>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="contrast-voetnoot">
        <span aria-hidden="true">* </span>
        {strings.contrast.apcaUitleg}
      </p>
    </section>
  )
}
