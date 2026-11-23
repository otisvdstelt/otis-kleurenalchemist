import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import type { Bottle } from '../../lib/alchemy/bottle'
import { store, useAlchemy } from '../../lib/store'
import { bottleSlot, FLASK } from '../../lib/world/spec'
import { FACES, LABEL_INK } from './look'
import { flaskLiquid, setLayers } from './liquid'
import { glass } from './materials'
import { motion } from './motion'
import { MeshBasicMaterial, PlaneGeometry } from 'three'

const paper = new MeshBasicMaterial({ color: '#efe4c8' })
const label = new PlaneGeometry(0.27, 0.1)
import { Piece } from './Piece'

/** De flesjes op de plank boven de ketel, elk met zijn palet in lagen. Erop drukken pakt het van de plank */
export function ShelfBottles({ onOpen }: { onOpen: () => void }) {
  const shelf = useAlchemy((s) => s.shelf)
  return (
    <>
      {shelf.map((bottle, i) => {
        const at = bottleSlot(i)
        return at ? <ShelfBottle key={`${bottle.name}-${bottle.recipe.seed}-${bottle.date}`} bottle={bottle} at={at} onOpen={onOpen} /> : null
      })}
    </>
  )
}

function ShelfBottle({ bottle, at, onOpen }: { bottle: Bottle; at: readonly [number, number, number]; onOpen: () => void }) {
  const material = useMemo(() => {
    const m = flaskLiquid()
    m.uniforms.uFill.value = 1
    m.uniforms.uStir.value = 0
    return m
  }, [])
  useEffect(() => setLayers(material, bottle.swatches), [material, bottle])
  useEffect(() => () => material.dispose(), [material])

  // Een flesje op de plank is wat kleiner dan het flesje op de werkbank
  const scale = 0.72
  return (
    <group
      position={at as unknown as [number, number, number]}
      scale={scale}
      onClick={(event: ThreeEvent<MouseEvent>) => {
        event.stopPropagation()
        store.open(bottle, 'plank')
        onOpen()
      }}
      onPointerOver={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        document.body.style.cursor = 'pointer'
        motion.wake(0.3)
      }}
      onPointerOut={() => {
        document.body.style.cursor = ''
      }}
    >
      <Piece name="flask-liquid" hung material={material} castShadow={false} />
      <Piece name="flask-cork" hung />
      <Piece name="flask" hung material={glass} castShadow={false} renderOrder={2} />
      {/* Een papiertje op de buik van het flesje, met de naam erop */}
      <mesh position={[0, FLASK.height * 0.3, FLASK.radius + 0.006]} rotation={[0, 0, -0.04]} material={paper} geometry={label} renderOrder={3} />
      <Text font={FACES.hand} fontSize={0.04} maxWidth={0.24} lineHeight={1} textAlign="center" anchorX="center" anchorY="middle" color={LABEL_INK} position={[0, FLASK.height * 0.3, FLASK.radius + 0.012]} rotation={[0, 0, -0.04]} renderOrder={4}>
        {bottle.name}
      </Text>
    </group>
  )
}
