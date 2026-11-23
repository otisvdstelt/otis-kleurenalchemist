import { strings } from '../../content/strings'
import { labelFor } from '../../lib/alchemy/contrast'
import type { Swatch } from '../../lib/alchemy/palette'

/**
 * Een papieren kaartje in de kleuren van het palet: een kop, wat tekst, een knop en een label.
 * Alles wat je hier ziet, is precies wat de contrastcheck meet: tekst op achtergrond en oppervlak, accent en signaal op de achtergrond,
 * en de tekst op een knop in het accent en het signaal
 */
export function Proefvel({ swatches }: { swatches: readonly Swatch[] }) {
  const find = (role: Swatch['role']) => swatches.find((s) => s.role === role)?.hex
  const background = find('achtergrond') ?? '#ffffff'
  const surface = find('oppervlak') ?? background
  const text = find('tekst') ?? '#000000'
  const signalAt = swatches.findIndex((s) => s.role === 'signaal')
  const signal = signalAt >= 0 ? swatches[signalAt].hex : undefined
  const accentAt = swatches.map((s, i) => (s.role === 'accent' ? i : -1)).filter((i) => i >= 0)
  const accents = accentAt.map((i) => swatches[i].hex)
  // De tekst op een knop: de kleur die de kern kiest, achtergrond of tekst
  const labelOn = (i: number) => {
    const label = labelFor(swatches, i)
    return label >= 0 ? swatches[label].hex : text
  }

  return (
    <figure className="proefvel" style={{ background, color: text }}>
      <figcaption className="sr-only">{strings.proefvel.kop}</figcaption>
      <div className="proefvel-kaart" style={{ background: surface }}>
        <p className="proefvel-titel">{strings.proefvel.titel}</p>
        <p className="proefvel-tekst">{strings.proefvel.tekst}</p>
      </div>
      <div className="proefvel-rij">
        {accents[0] && (
          <span className="proefvel-knop" style={{ background: accents[0], borderColor: accents[0], color: labelOn(accentAt[0]) }}>
            {strings.proefvel.knop}
          </span>
        )}
        {signal && (
          <span className="proefvel-label" style={{ background: signal, borderColor: signal, color: labelOn(signalAt) }}>
            {strings.proefvel.label}
          </span>
        )}
        {accents.slice(1).map((hex, i) => (
          <span key={i} className="proefvel-link" style={{ textDecorationColor: hex }}>
            {strings.proefvel.link}
          </span>
        ))}
      </div>
    </figure>
  )
}
