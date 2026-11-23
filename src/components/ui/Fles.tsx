import { useId, useMemo } from 'react'
import { luminance } from '../../lib/alchemy/contrast'
import type { Swatch } from '../../lib/alchemy/palette'
import { FLES_BODY as BODY, FLES_CORK, FLES_FILL } from './flesVorm'

/** Een flesje met het palet als gelaagde vloeistof: één laag per kleur, de zwaarste (donkerste) onderop */
export function Fles({ swatches, pourKey, className }: { swatches: readonly Swatch[]; pourKey: string; className?: string }) {
  const id = useId()
  const layers = useMemo(() => [...swatches].sort((a, b) => luminance(a.hex) - luminance(b.hex)), [swatches])
  const { top, bottom } = FLES_FILL
  const h = (bottom - top) / layers.length
  return (
    <svg viewBox="0 0 120 210" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-fles`}>
          <path d={BODY} />
        </clipPath>
      </defs>
      <path d={BODY} fill="#fcfaf3" fillOpacity="0.35" />
      <g clipPath={`url(#${id}-fles)`}>
        {/* Bij het inschenken lopen de lagen in elkaar over, en trekken ze daarna weer uit elkaar */}
        <g key={pourKey} className="fles-lagen">
          {layers.map((s, i) => (
            <rect key={i} x="0" y={bottom - (i + 1) * h - 0.5} width="120" height={h + 1} fill={s.hex} />
          ))}
        </g>
        <path d={`M28 ${top + 6}q-2 50 2 110`} fill="none" stroke="#fcfaf3" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g filter="url(#wobble)">
        <path d={BODY} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d={FLES_CORK} fill="#b07a4a" stroke="#2c2823" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M53 12h5M62 18h4" stroke="#2c2823" strokeOpacity="0.35" strokeWidth="1.6" strokeLinecap="round" />
      </g>
    </svg>
  )
}
