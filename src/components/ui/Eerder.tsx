import { strings } from '../../content/strings'
import { store, useAlchemy } from '../../lib/store'
import { Fles } from './Fles'

/** De laatste vijf flesjes uit de ketel, om er een weer bij te pakken */
export function Eerder() {
  const recent = useAlchemy((s) => s.recent)
  const current = useAlchemy((s) => s.flask?.bottle)
  const others = recent.filter((b) => b !== current)
  if (others.length === 0) return null
  return (
    <section className="eerder" aria-labelledby="eerder-kop">
      <h3 id="eerder-kop" className="plank-sub">
        {strings.ketel.eerder}
      </h3>
      <ol className="eerder-rij">
        {others.map((bottle) => (
          <li key={`${bottle.name}-${bottle.recipe.seed}-${bottle.swatches.map((s) => s.hex).join('')}`}>
            <button type="button" className="plank-fles" aria-label={strings.ketel.eerderOpen(bottle.name)} onClick={() => store.open(bottle, 'plank')}>
              <Fles swatches={bottle.swatches} pourKey="eerder" className="eerder-glas" />
              <span className="plank-naam hand" aria-hidden="true">
                {bottle.name}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
