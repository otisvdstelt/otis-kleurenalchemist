import type { CSSProperties } from 'react'
import type { Boil, Brew } from '../../lib/alchemy/mix'

interface KetelTekeningProps {
  brew: Brew | null
  boil: Boil
  /** Er is net geroerd, dus de draaikolk gaat harder */
  fast: boolean
}

const CX = 160
const CY = 112
const RX = 106
const RY = 20

/** Een spiraalarm van de draaikolk, in een cirkel die later platgedrukt wordt tot het oppervlak */
function arm(turn: number, r: number) {
  const points: string[] = []
  for (let k = 0; k <= 28; k++) {
    const t = k / 28
    const a = turn + t * Math.PI * 1.9
    const radius = r * (0.08 + 0.95 * t)
    points.push(`${(CX + Math.cos(a) * radius).toFixed(1)} ${(CY + Math.sin(a) * radius).toFixed(1)}`)
  }
  return `M${points.join('L')}`
}

/** De ketel op het vuur, getekend. Wat erin zit draait als strepen rond, en vervloeit naarmate er geroerd is */
export function KetelTekening({ brew, boil, fast }: KetelTekeningProps) {
  const streaks = brew?.streaks ?? []
  const surface = brew?.blend ?? '#3f4a45'
  const mixedIn = brew?.homogeneity ?? 0
  // Bij overkoken komt er donkere rook uit, anders damp in de kleuren van het palet
  const steam = brew?.boil === 'overkoken' ? ['#4a3a2e', '#5c4836', '#3f3127', '#6b5038', '#4a3a2e'] : brew ? brew.swatches.map((s) => s.hex) : ['#a3c1ad', '#a3c1ad', '#a3c1ad']
  const bubbles = boil === 'leeg' ? 0 : boil === 'rustig' ? 4 : boil === 'onrustig' ? 9 : 12

  return (
    <svg viewBox="0 0 320 290" className="ketel-tekening" data-boil={boil} data-fast={fast} aria-hidden="true">
      <defs>
        <clipPath id="ketel-oppervlak">
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} />
        </clipPath>
      </defs>

      {/* Damp, ingekleurd naar het palet. Hier zie je het palet het eerst */}
      <g className="ketel-damp" filter="url(#bleed)">
        {steam.slice(0, 5).map((hex, i) => (
          <ellipse key={i} className="ketel-wolk" style={{ '--i': i } as CSSProperties} cx={110 + i * 26} cy={62 - (i % 2) * 18} rx={26} ry={20} fill={hex} opacity={brew ? 0.75 : 0.25} />
        ))}
      </g>

      {/* Het vuur en de blokken hout */}
      <g className="ketel-vuur" filter="url(#wobble)">
        <path d="M96 276l128-14M100 262l124 16" stroke="#5c3b29" strokeWidth="11" strokeLinecap="round" />
        <path className="vlam" d="M128 270c-8-18 4-26 2-40 12 10 18 22 12 40Z" fill="#e3b659" />
        <path className="vlam" style={{ animationDelay: '-0.4s' }} d="M150 272c-10-24 8-34 6-52 16 14 22 32 14 52Z" fill="#b8623b" />
        <path className="vlam" style={{ animationDelay: '-0.8s' }} d="M178 270c-6-16 6-24 4-36 10 9 14 20 8 36Z" fill="#e3b659" />
      </g>

      {/* De ketel zelf, gietijzer */}
      <g filter="url(#wobble)">
        <path d="M70 226l-10 26M250 226l10 26" stroke="#2c2823" strokeWidth="8" strokeLinecap="round" />
        <path d={`M${CX - 122} ${CY}C${CX - 122} 208 ${CX - 70} 250 ${CX} 250S${CX + 122} 208 ${CX + 122} ${CY}`} fill="#3a332e" stroke="#2c2823" strokeWidth="3" />
        <path d={`M${CX - 98} 140c6 40 30 70 64 84`} fill="none" stroke="#fcfaf3" strokeOpacity="0.16" strokeWidth="7" strokeLinecap="round" />
      </g>

      {/* Het oppervlak: de mengkleur, met de strepen die nog niet zijn opgegaan */}
      <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={surface} />
      {streaks.length > 0 && (
        <g clipPath="url(#ketel-oppervlak)">
          <g transform={`translate(0 ${CY}) scale(1 ${RY / RX}) translate(0 ${-CY})`}>
            <g className="draaikolk" opacity={Math.max(0, 1 - mixedIn * 1.05)}>
              {streaks.map((streak, i) => (
                <path key={i} d={arm((i / streaks.length) * Math.PI * 2, RX * (0.85 + (i % 3) * 0.08))} fill="none" stroke={streak.hex} strokeWidth={14 + streak.weight * 60} strokeOpacity={0.85} strokeLinecap="round" />
              ))}
            </g>
          </g>
        </g>
      )}
      {/* Bellen */}
      <g className="ketel-bellen">
        {Array.from({ length: bubbles }, (_, i) => (
          <circle key={i} className="bel" style={{ '--i': i } as CSSProperties} cx={CX - 80 + ((i * 47) % 160)} cy={CY - 6 + ((i * 13) % 14)} r={3 + (i % 3) * 1.5} fill="#fcfaf3" fillOpacity="0.55" />
        ))}
      </g>

      {/* De rand */}
      <ellipse cx={CX} cy={CY} rx={RX + 12} ry={RY + 6} fill="none" stroke="#2c2823" strokeWidth="9" filter="url(#wobble)" />
      <ellipse cx={CX} cy={CY - 1} rx={RX + 12} ry={RY + 6} fill="none" stroke="#5e554a" strokeWidth="3" filter="url(#wobble)" />

      {/* Overkoken: schuim op de rand en modder langs de buik */}
      {boil === 'overkoken' && (
        <g className="ketel-over" filter="url(#wobble)">
          <path d="M64 120c-4 22 2 40-4 62 10-6 8-30 14-56ZM232 126c4 26-2 44 6 70 6-12 0-38-2-64ZM150 136c0 18-4 28 2 44 5-14 4-28 6-42Z" fill="#6b5038" />
          {Array.from({ length: 9 }, (_, i) => (
            <circle key={i} cx={52 + i * 27} cy={CY - 14 + (i % 2) * 22} r={9 + (i % 3) * 3} fill="#d8c8a8" stroke="#6b5038" strokeWidth="1.5" />
          ))}
        </g>
      )}
    </svg>
  )
}
