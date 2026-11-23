import { strings } from '../../content/strings'
import type { Swatch } from '../../lib/alchemy/palette'

/**
 * Een papieren kaartje in de kleuren van het palet: een kop, wat tekst, een knop en een label.
 * Alles wat je hier ziet, is precies wat de contrastcheck meet: tekst op achtergrond en oppervlak, en accent en signaal op de achtergrond
 */
export function Proefvel({ swatches }: { swatches: readonly Swatch[] }) {
  const find = (role: Swatch['role']) => swatches.find((s) => s.role === role)?.hex
  const background = find('achtergrond') ?? '#ffffff'
  const surface = find('oppervlak') ?? background
  const text = find('tekst') ?? '#000000'
  const signal = find('signaal')
  const accents = swatches.filter((s) => s.role === 'accent').map((s) => s.hex)

  return (
    <figure className="proefvel" style={{ background, color: text }}>
      <figcaption className="sr-only">{strings.proefvel.kop}</figcaption>
      <div className="proefvel-kaart" style={{ background: surface }}>
        <p className="proefvel-titel">{strings.proefvel.titel}</p>
        <p className="proefvel-tekst">{strings.proefvel.tekst}</p>
      </div>
      <div className="proefvel-rij">
        {accents[0] && (
          <span className="proefvel-knop" style={{ borderColor: accents[0] }}>
            {strings.proefvel.knop}
          </span>
        )}
        {signal && (
          <span className="proefvel-label" style={{ borderColor: signal }}>
            <span className="proefvel-stip" style={{ background: signal }} />
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
