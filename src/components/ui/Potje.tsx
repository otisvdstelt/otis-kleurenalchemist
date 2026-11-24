import { useId, useMemo } from 'react'
import { jarLayers, type Ingredient, type JarShape } from '../../lib/alchemy/ingredients'

const BOTTOM = 86

/** De omtrek van het glas, voor een lijf dat bij `top` begint */
function bodyPath(shape: JarShape, top: number): string {
  const mid = (top + BOTTOM) / 2
  switch (shape) {
    case 'pot':
      return `M13 ${top}H47Q49 ${top} 49 ${top + 3}V${BOTTOM - 3}Q49 ${BOTTOM} 46 ${BOTTOM}H14Q11 ${BOTTOM} 11 ${BOTTOM - 3}V${top + 3}Q11 ${top} 13 ${top}Z`
    case 'slank':
      return `M23 ${top}H37Q40 ${top + 4} 40 ${top + 9}V${BOTTOM - 3}Q40 ${BOTTOM} 37 ${BOTTOM}H23Q20 ${BOTTOM} 20 ${BOTTOM - 3}V${top + 9}Q20 ${top + 4} 23 ${top}Z`
    case 'bol':
      return `M25 ${top}H35V${top + 4}C47 ${top + 7} 51 ${mid} 49 ${mid + 6}C47 ${BOTTOM - 2} 13 ${BOTTOM - 2} 11 ${mid + 6}C9 ${mid} 13 ${top + 7} 25 ${top + 4}Z`
    case 'buik':
      return `M24 ${top}H36V${top + 5}C38 ${top + 14} 52 ${mid} 51 ${BOTTOM - 8}C50 ${BOTTOM} 10 ${BOTTOM} 9 ${BOTTOM - 8}C8 ${mid} 22 ${top + 14} 24 ${top + 5}Z`
    case 'kolf':
      return `M25 ${top}H35V${top + 14}L51 ${BOTTOM - 5}Q53 ${BOTTOM} 48 ${BOTTOM}H12Q7 ${BOTTOM} 9 ${BOTTOM - 5}L25 ${top + 14}Z`
    case 'blik':
      return `M12 ${top + 2}H48V${BOTTOM - 2}Q48 ${BOTTOM} 46 ${BOTTOM}H14Q12 ${BOTTOM} 12 ${BOTTOM - 2}Z`
    case 'zakje':
      return `M24 ${top + 6}C20 ${top + 12} 9 ${mid} 10 ${BOTTOM - 8}C11 ${BOTTOM} 49 ${BOTTOM} 50 ${BOTTOM - 8}C51 ${mid} 40 ${top + 12} 36 ${top + 6}Z`
  }
}

/** Hoe breed de kurk is per vorm */
const CORK: Record<JarShape, [number, number]> = {
  pot: [15, 45],
  slank: [22, 38],
  bol: [24, 36],
  buik: [23, 37],
  kolf: [24, 36],
  blik: [12, 48],
  zakje: [25, 35],
}

interface PotjeProps {
  ingredient: Ingredient
  className?: string
}

/** Een potje van glas, met de pigmenten als lagen poeder erachter */
export function Potje({ ingredient, className }: PotjeProps) {
  const id = useId()
  const { shape, height, cork } = ingredient.jar
  const top = BOTTOM - 54 * Math.min(1.35, Math.max(0.6, height))
  const body = bodyPath(shape, top)
  const [left, right] = CORK[shape]
  const layers = useMemo(() => {
    if (ingredient.effect === 'contrast')
      return [
        { hex: '#2c2823', share: 0.5 },
        { hex: '#f7f4eb', share: 0.5 },
      ]
    if (ingredient.effect === 'water') return [{ hex: '#a3c1ad', share: 1 }]
    if (ingredient.effect === 'houtskool') return [{ hex: '#26211d', share: 1 }]
    return jarLayers(ingredient)
  }, [ingredient])

  // Driekwart vol, de lagen naar hun aandeel
  const fillTop = top + (BOTTOM - top) * 0.28
  const span = BOTTOM - fillTop
  const bands = layers.map(({ hex, share }, i) => {
    const h = span * share
    // De bovenkant van deze laag: alles wat eronder ligt, en deze laag zelf
    const t = BOTTOM - span * layers.slice(0, i + 1).reduce((sum, l) => sum + l.share, 0)
    // Een golvende bovenkant, zoals poeder dat erin gestort is
    const wave = `M0 ${t + 1.5}Q8 ${t - 1.5} 16 ${t + 0.5}T32 ${t}T48 ${t + 1}T64 ${t}V${t + h + 2}H0Z`
    return <path key={i} d={wave} fill={hex} opacity={ingredient.effect === 'water' ? 0.55 : 1} />
  })

  return (
    <svg viewBox="0 0 60 90" className={className} aria-hidden="true">
      <defs>
        <clipPath id={`${id}-glas`}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* Het glas zelf, een vleugje licht */}
      <path d={body} fill="#fcfaf3" fillOpacity="0.4" />
      <g clipPath={`url(#${id}-glas)`}>
        {bands}
        {ingredient.effect === 'houtskool' && (
          <g fill="#4a3f36">
            <circle cx="22" cy={BOTTOM - 6} r="3.5" />
            <circle cx="33" cy={BOTTOM - 10} r="4.2" />
            <circle cx="42" cy={BOTTOM - 5} r="3" />
          </g>
        )}
      </g>
      <g filter="url(#wobble)">
        <path d={body} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        {/* Glans op het glas */}
        <path d={`M${left + 1} ${top + 12}q-3 10 -2 22`} fill="none" stroke="#fcfaf3" strokeOpacity="0.85" strokeWidth="2" strokeLinecap="round" />
        {/* De kurk */}
        <path d={`M${left} ${top - 9}H${right}l-1 10H${left + 1}Z`} fill={cork} stroke="#2c2823" strokeWidth="1.6" strokeLinejoin="round" />
        <path d={`M${left + 3} ${top - 5}h3M${right - 7} ${top - 3}h2`} stroke="#2c2823" strokeOpacity="0.35" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    </svg>
  )
}
