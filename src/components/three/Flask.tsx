import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { useAlchemy } from '../../lib/store'
import { flaskLiquid, setLayers } from './liquid'
import { glass } from './materials'
import { motion } from './motion'
import { Piece } from './Piece'

/** Het flesje op de werkbank. Bij het bottelen loopt het vol, de lagen klotsen door elkaar en trekken dan weer uit elkaar */
export function Flask({ reducedMotion }: { reducedMotion: boolean }) {
  const flask = useAlchemy((s) => s.flask)
  const material = useMemo(() => flaskLiquid(), [])
  const pour = useRef({ started: -1 })

  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    if (!flask) return
    setLayers(material, flask.bottle.swatches)
    pour.current.started = reducedMotion ? -1 : performance.now()
    if (reducedMotion) {
      material.uniforms.uFill.value = 1
      material.uniforms.uStir.value = 0
    } else {
      material.uniforms.uFill.value = 0
      material.uniforms.uStir.value = 1
      motion.wake(3)
    }
  }, [flask, material, reducedMotion])

  useFrame(() => {
    if (pour.current.started < 0) return
    const t = (performance.now() - pour.current.started) / 1000
    material.uniforms.uFill.value = Math.min(1, t / 1.2) ** 0.7
    material.uniforms.uStir.value = Math.max(0, 1 - Math.max(0, t - 0.5) / 1.1)
    if (t > 1.8) pour.current.started = -1
  })

  return (
    <>
      <Piece name="flask-cork" />
      {flask && <Piece name="flask-liquid" material={material} castShadow={false} />}
      <Piece name="flask" material={glass} castShadow={false} renderOrder={2} />
    </>
  )
}
