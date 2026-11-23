import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import { MeshToonMaterial } from 'three'
import { isSpecial, type Ingredient } from '../../lib/alchemy/ingredients'
import { store, useAlchemy, useBrew } from '../../lib/store'
import { jarForm, jarSlots, labelOf } from '../../lib/world/spec'
import { useParts } from './assets'
import { FACES, LABEL_INK } from './look'
import { glass, glow, shaft, toonGradient, windowGlow } from './materials'
import { Piece } from './Piece'

/** Wat in de ketel zit, voorlopig in één kleur. In fase 5 krijgt het zijn draaikolk */
const liquid = new MeshToonMaterial({ color: '#3f4a45', gradientMap: toonGradient })
const flaskLiquid = new MeshToonMaterial({ color: '#ffffff', gradientMap: toonGradient })

const pointer = (on: boolean) => (event: ThreeEvent<PointerEvent>) => {
  event.stopPropagation()
  document.body.style.cursor = on ? 'pointer' : ''
}

/** De werkplaats, stuk voor stuk uit het gebakken model */
export function Workshop() {
  const catalogue = useAlchemy((s) => s.catalogue)
  const brew = useBrew()
  const flask = useAlchemy((s) => s.flask)
  liquid.color.set(brew?.blend ?? '#3f4a45')
  if (flask) flaskLiquid.color.set(flask.brew.blend)

  return (
    <>
      {['room', 'window', 'shelves', 'bench', 'candles', 'owl', 'herbs', 'fire', 'cauldron'].map((name) => (
        <Piece key={name} name={name} />
      ))}
      <Piece name="window-light" material={windowGlow} castShadow={false} receiveShadow={false} />
      <Piece name="shaft" material={shaft} castShadow={false} receiveShadow={false} renderOrder={5} />
      <Piece name="flames" material={glow} castShadow={false} receiveShadow={false} />
      <Piece name="candle-flames" material={glow} castShadow={false} receiveShadow={false} />
      <Piece name="cauldron-liquid" material={liquid} castShadow={false} />
      <Piece name="ladle" />
      <Piece name="flask-cork" />
      {flask && <Piece name="flask-liquid" material={flaskLiquid} castShadow={false} />}
      <Piece name="flask" material={glass} castShadow={false} renderOrder={2} />
      {catalogue && <Jars catalogue={catalogue} />}
    </>
  )
}

/** De potjes op de planken en de werkbank, met hun etiket. Erop drukken gooit het potje in de ketel */
function Jars({ catalogue }: { catalogue: readonly Ingredient[] }) {
  const parts = useParts()
  const placed = useMemo(() => {
    const forms = new Map(catalogue.map((i) => [i.id, jarForm(i.jar.shape, i.jar.height)]))
    const slots = jarSlots(
      catalogue.filter((i) => !isSpecial(i)).map((i) => ({ id: i.id, widest: forms.get(i.id)!.widest })),
      catalogue.filter(isSpecial).map((i) => ({ id: i.id, widest: forms.get(i.id)!.widest })),
    )
    return catalogue.flatMap((ingredient) => {
      const slot = slots.get(ingredient.id)
      if (!slot || !parts.geometry[`jar-${ingredient.id}`]) return []
      return [{ ingredient, slot, label: labelOf(forms.get(ingredient.id)!) }]
    })
  }, [catalogue, parts])

  return (
    <>
      {placed.map(({ ingredient, slot, label }) => (
        <group key={ingredient.id} position={slot.at as [number, number, number]} onClick={(event) => (event.stopPropagation(), store.add(ingredient.id))} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
          <Piece name={`jar-${ingredient.id}`} hung />
          <Piece name={`glass-${ingredient.id}`} hung material={glass} castShadow={false} renderOrder={2} />
          <group rotation={[0, slot.turn, 0]}>
            <Text font={FACES.hand} fontSize={0.034} maxWidth={label.width * 0.95} lineHeight={1} textAlign="center" anchorX="center" anchorY="middle" color={LABEL_INK} position={[0, label.y, label.out + 0.004]} renderOrder={3}>
              {ingredient.name}
            </Text>
          </group>
        </group>
      ))}
    </>
  )
}
