import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { DoubleSide, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, type Mesh } from 'three'
import { useAlchemy } from '../../lib/store'
import { CAULDRON, LIQUID_Y } from '../../lib/world/spec'
import { motion } from './motion'

const card = new PlaneGeometry(0.34, 0.42)
const FALL = 1.1
const SINK = 0.9

/** Een foto valt als papieren kaartje in de ketel, dwarrelt, en lost op in wat erin zit */
export function PhotoCard({ reducedMotion }: { reducedMotion: boolean }) {
  const drop = useAlchemy((s) => s.photoDrop)
  const mesh = useRef<Mesh>(null)
  const started = useRef(-1)
  const material = useMemo(() => new MeshBasicMaterial({ color: '#ffffff', side: DoubleSide, transparent: true }), [])

  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    if (!drop || reducedMotion) return
    let cancelled = false
    new TextureLoader().load(drop.url, (texture) => {
      if (cancelled) return
      texture.colorSpace = SRGBColorSpace
      material.map?.dispose()
      material.map = texture
      material.needsUpdate = true
      started.current = performance.now()
      motion.wake(FALL + SINK + 0.3)
    })
    return () => {
      cancelled = true
    }
  }, [drop, material, reducedMotion])

  useFrame(() => {
    const m = mesh.current
    if (!m) return
    if (started.current < 0) {
      m.visible = false
      return
    }
    const t = (performance.now() - started.current) / 1000
    const [cx, , cz] = CAULDRON.at
    m.visible = true
    if (t < FALL) {
      // Dwarrelen: heen en weer, en kantelen
      const f = t / FALL
      m.position.set(cx + Math.sin(f * 7) * 0.18 * (1 - f), LIQUID_Y + 1.7 * (1 - f * f) + 0.02, cz + Math.cos(f * 5) * 0.08)
      m.rotation.set(-Math.PI / 2 + Math.sin(f * 9) * 0.6 * (1 - f), f * 2.4, Math.sin(f * 6) * 0.5 * (1 - f))
      material.opacity = 1
      m.scale.setScalar(1)
    } else if (t < FALL + SINK) {
      // Oplossen: het kaartje wordt kleiner en doorzichtig, en draait mee in de kolk
      const f = (t - FALL) / SINK
      m.position.y = LIQUID_Y + 0.02
      m.rotation.set(-Math.PI / 2, 2.4 + f * 1.5, 0)
      m.scale.setScalar(1 - f * 0.6)
      material.opacity = 1 - f
    } else {
      started.current = -1
      m.visible = false
    }
  })

  return <mesh ref={mesh} geometry={card} material={material} visible={false} renderOrder={3} />
}
