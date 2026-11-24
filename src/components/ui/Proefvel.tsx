import type { CSSProperties } from 'react'
import { strings } from '../../content/strings'
import { labelFor } from '../../lib/alchemy/contrast'
import type { GoalId } from '../../lib/alchemy/ingredients'
import type { Role, Swatch } from '../../lib/alchemy/palette'

/**
 * Het palet in gebruik, per doel: een websitekaart, een donker appscherm, een affiche, een visitekaartje of een dia.
 * Alles wat je hier ziet, is wat de contrastcheck meet
 */
export function Proefvel({ swatches, goal }: { swatches: readonly Swatch[]; goal?: GoalId }) {
  const find = (role: Role, n = 1) => swatches.filter((s) => s.role === role)[n - 1]?.hex
  const bg = find('achtergrond') ?? '#ffffff'
  const text = find('tekst') ?? '#000000'
  const p = strings.proefvel
  // De tekst op een knop: wat de kern kiest. Bij de hoofdkleur de eigen rol "op-hoofd" als die er is
  const labelOn = (role: Role) => {
    const i = swatches.findIndex((s) => s.role === role)
    if (i < 0) return text
    if (role === 'hoofd' && find('op-hoofd')) return find('op-hoofd')!
    const label = labelFor(swatches, i)
    return label >= 0 ? swatches[label].hex : text
  }

  if (goal === 'website' || goal === 'donker') {
    const surface = find('oppervlak') ?? bg
    const main = find('hoofd')!
    return (
      <figure className="proefvel proefvel-site" style={{ background: bg, color: text }}>
        <figcaption className="sr-only">{p.kop}</figcaption>
        <div className="proefvel-kaart" style={{ background: surface, border: `1.5px solid ${find('rand') ?? surface}` }}>
          <p className="proefvel-titel">{goal === 'donker' ? p.appTitel : p.titel}</p>
          <p className="proefvel-tekst">{p.tekst}</p>
          <p className="proefvel-zacht" style={{ color: find('zachte-tekst') }}>
            {p.zacht}
          </p>
          <div className="proefvel-rij">
            <span className="proefvel-knop" style={{ background: main, borderColor: main, color: labelOn('hoofd') }}>
              {p.knop}
            </span>
            {find('accent') && (
              <span className="proefvel-link" style={{ textDecorationColor: find('accent'), color: text }}>
                {p.link}
              </span>
            )}
          </div>
        </div>
        <ul className="proefvel-meldingen">
          {(['goed', 'let-op', 'fout'] as const).map((role) =>
            find(role) ? (
              <li key={role}>
                <span className="proefvel-stip" style={{ background: find(role) }} />
                {p.melding[role]}
              </li>
            ) : null,
          )}
        </ul>
      </figure>
    )
  }

  if (goal === 'affiche') {
    const main = find('hoofd')!
    const accent = find('accent') ?? main
    return (
      <figure className="proefvel proefvel-affiche" style={{ background: bg, color: text }}>
        <figcaption className="sr-only">{p.kop}</figcaption>
        <span className="affiche-zon" style={{ background: main }} aria-hidden="true" />
        <span className="affiche-streep" style={{ background: accent }} aria-hidden="true" />
        <p className="affiche-titel">{p.afficheTitel}</p>
        <p className="affiche-tekst">{p.afficheTekst}</p>
        <span className="proefvel-knop affiche-knop" style={{ background: main, borderColor: main, color: labelOn('hoofd') }}>
          {p.afficheKnop}
        </span>
      </figure>
    )
  }

  if (goal === 'huisstijl') {
    const main = find('hoofd')!
    const support = find('accent') ?? main
    return (
      <figure className="proefvel proefvel-kaartje" style={{ background: bg, color: text }}>
        <figcaption className="sr-only">{p.kop}</figcaption>
        <span className="kaartje-logo" aria-hidden="true">
          <span style={{ background: main }} />
          <span style={{ background: support }} />
        </span>
        <p className="kaartje-naam">{p.kaartjeNaam}</p>
        <p className="kaartje-wat" style={{ color: main }}>
          {p.kaartjeWat}
        </p>
        <p className="kaartje-adres">{p.kaartjeAdres}</p>
      </figure>
    )
  }

  if (goal === 'presentatie') {
    const bars = swatches.filter((s) => s.role === 'grafiek')
    const heights = [72, 48, 90, 60, 36, 80]
    return (
      <figure className="proefvel proefvel-dia" style={{ background: bg, color: text }}>
        <figcaption className="sr-only">{p.kop}</figcaption>
        <p className="dia-titel">{p.diaTitel}</p>
        <p className="dia-sub" style={{ color: find('zachte-tekst') ?? text }}>
          {p.diaSub}
        </p>
        <div className="dia-grafiek" role="img" aria-label={p.diaGrafiek}>
          {bars.map((s, i) => (
            <span key={i} className="dia-staaf" style={{ '--h': `${heights[i % heights.length]}%`, background: s.hex } as CSSProperties} />
          ))}
        </div>
        <div className="dia-as" style={{ borderColor: find('zachte-tekst') ?? text }} />
      </figure>
    )
  }

  // Een flesje uit de eerste versie: de oude rollen
  const surface = find('oppervlak') ?? bg
  const signal = find('signaal')
  const accent = find('accent')
  return (
    <figure className="proefvel" style={{ background: bg, color: text }}>
      <figcaption className="sr-only">{p.kop}</figcaption>
      <div className="proefvel-kaart" style={{ background: surface }}>
        <p className="proefvel-titel">{p.titel}</p>
        <p className="proefvel-tekst">{p.tekst}</p>
      </div>
      <div className="proefvel-rij">
        {accent && (
          <span className="proefvel-knop" style={{ background: accent, borderColor: accent, color: labelOn('accent') }}>
            {p.knop}
          </span>
        )}
        {signal && (
          <span className="proefvel-label" style={{ background: signal, borderColor: signal, color: labelOn('signaal') }}>
            {p.label}
          </span>
        )}
      </div>
    </figure>
  )
}
