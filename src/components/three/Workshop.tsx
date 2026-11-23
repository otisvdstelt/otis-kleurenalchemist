import { Text } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group } from 'three'
import { isSpecial, plainName, type Ingredient } from '../../lib/alchemy/ingredients'
import { store, useAlchemy } from '../../lib/store'
import { jarForm, jarSlots, labelOf, type Vec3 } from '../../lib/world/spec'
import { useParts } from './assets'
import { Cauldron } from './Cauldron'
import { Flask } from './Flask'
import { FACES, LABEL_INK } from './look'
import { glass, glow, shaft, windowGlow } from './materials'
import { motion } from './motion'
import { PhotoCard } from './PhotoCard'
import { Piece } from './Piece'
import { ShelfBottles } from './ShelfBottles'
import { Steam } from './Steam'

/** De werkplaats, stuk voor stuk uit het gebakken model */
export function Workshop({ reducedMotion, onOpenBottle }: { reducedMotion: boolean; onOpenBottle: () => void }) {
  const catalogue = useAlchemy((s) => s.catalogue)

  return (
    <>
      {['room', 'window', 'shelves', 'bottle-shelf', 'bench', 'candles', 'owl', 'herbs'].map((name) => (
        <Piece key={name} name={name} />
      ))}
      <Piece name="window-light" material={windowGlow} castShadow={false} receiveShadow={false} />
      <Piece name="candle-flames" material={glow} castShadow={false} receiveShadow={false} />
      <Cauldron reducedMotion={reducedMotion} />
      <Steam reducedMotion={reducedMotion} />
      {/* Het licht valt door de damp, dus het komt erna */}
      <Piece name="shaft" material={shaft} castShadow={false} receiveShadow={false} renderOrder={5} />
      <Flask reducedMotion={reducedMotion} />
      <PhotoCard reducedMotion={reducedMotion} />
      <ShelfBottles onOpen={onOpenBottle} />
      {catalogue && <Jars catalogue={catalogue} reducedMotion={reducedMotion} />}
    </>
  )
}

/** De potjes op de planken en de werkbank, met hun etiket. Erop drukken gooit het potje in de ketel */
function Jars({ catalogue, reducedMotion }: { catalogue: readonly Ingredient[]; reducedMotion: boolean }) {
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
        <Jar key={ingredient.id} ingredient={ingredient} at={slot.at} turn={slot.turn} label={label} reducedMotion={reducedMotion} />
      ))}
    </>
  )
}

interface JarProps {
  ingredient: Ingredient
  at: Vec3
  turn: number
  label: ReturnType<typeof labelOf>
  reducedMotion: boolean
}

/** Eén potje. Onder de wijzer komt het een beetje van de plank, en erop drukken laat het een sprongetje maken */
function Jar({ ingredient, at, turn, label, reducedMotion }: JarProps) {
  const group = useRef<Group>(null)
  const state = useRef({ hover: false, hop: 0, lift: 0 })

  useFrame((_, delta) => {
    const s = state.current
    const dt = Math.min(delta, 0.1)
    s.lift += ((s.hover ? 1 : 0) - s.lift) * (1 - Math.exp(-dt * 10))
    s.hop = Math.max(0, s.hop - dt * 2.4)
    if (!group.current) return
    const hop = reducedMotion ? 0 : Math.sin(s.hop * Math.PI) * 0.09
    group.current.position.y = at[1] + s.lift * 0.03 + hop
    group.current.rotation.z = reducedMotion ? 0 : Math.sin(s.hop * Math.PI * 2) * 0.12
  })

  return (
    <group
      ref={group}
      position={at as unknown as [number, number, number]}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        state.current.hop = 1
        motion.wake(1)
        store.add(ingredient.id)
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        state.current.hover = true
        document.body.style.cursor = 'pointer'
        motion.wake(0.8)
      }}
      onPointerOut={() => {
        state.current.hover = false
        document.body.style.cursor = ''
        motion.wake(0.8)
      }}
    >
      <Piece name={`jar-${ingredient.id}`} hung />
      <Piece name={`glass-${ingredient.id}`} hung material={glass} castShadow={false} renderOrder={2} />
      <group rotation={[0, turn, 0]}>
        <Text font={FACES.hand} fontSize={0.034} maxWidth={label.width * 0.95} lineHeight={1} textAlign="center" anchorX="center" anchorY="middle" color={LABEL_INK} position={[0, label.y, label.out + 0.004]} renderOrder={3}>
          {plainName(ingredient)}
        </Text>
      </group>
    </group>
  )
}
