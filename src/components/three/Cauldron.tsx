import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, type Group, type Mesh } from 'three'
import { air } from '../../lib/air'
import { useAlchemy, useBrew } from '../../lib/store'
import { LADLE_PIVOT } from '../../lib/world/spec'
import { cauldronLiquid, MAX_STREAKS } from './liquid'
import { glow } from './materials'
import { motion } from './motion'
import { Piece } from './Piece'

const ease = (from: number, to: number, dt: number, rate: number) => from + (to - from) * (1 - Math.exp(-dt * rate))
const BOIL = { leeg: 0, rustig: 0.25, onrustig: 1, overkoken: 1.6 }
const scratch = new Color()

/** De ketel: het oppervlak met de draaikolk, de pollepel die meedraait, en het vuur dat flakkert */
export function Cauldron({ reducedMotion }: { reducedMotion: boolean }) {
  const brew = useBrew()
  const stir = useAlchemy((s) => s.stir)
  const material = useMemo(() => cauldronLiquid(), [])
  const ladle = useRef<Group>(null)
  const flames = useRef<Mesh>(null)
  const spin = useRef({ angle: 0, speed: 0, ladle: 0 })

  useEffect(() => () => material.dispose(), [material])

  // De strepen: de pigmenten zoals ze erin gingen, de zwaarste twaalf, en hun aandeel
  useEffect(() => {
    const u = material.uniforms
    const streaks = [...(brew?.streaks ?? [])].sort((a, b) => b.weight - a.weight).slice(0, MAX_STREAKS)
    const total = streaks.reduce((sum, s) => sum + s.weight, 0) || 1
    streaks.forEach((s, i) => {
      ;(u.uStreaks.value as Color[])[i].set(s.hex)
      ;(u.uWeights.value as number[])[i] = s.weight / total
    })
    u.uCount.value = streaks.length
    if (brew) (u.uBlend.value as Color).set(brew.blend)
    // De kamer neigt naar de kleur van de damp
    if (brew) {
      scratch.set(brew.blend)
      air.tint.r = scratch.r
      air.tint.g = scratch.g
      air.tint.b = scratch.b
    }
    air.tint.amount = brew ? 0.2 : 0
    motion.wake(3)
  }, [brew, material])

  // Elke slag geeft de draaikolk een zet
  useEffect(() => {
    if (!stir.at) return
    spin.current.speed = Math.min(10, spin.current.speed + 2.4 * stir.strokes)
    motion.wake(4)
  }, [stir])

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    const u = material.uniforms
    const s = spin.current
    s.speed *= Math.exp(-dt * 0.8)
    // Zonder beweging blijven de stappen hetzelfde, maar draait er niks
    const drift = brew && !reducedMotion ? 0.22 : 0
    if (!reducedMotion) {
      s.angle += (s.speed + drift) * dt
      s.ladle += s.speed * dt
    }
    u.uSwirl.value = s.angle
    u.uFilled.value = ease(u.uFilled.value, brew ? 1 : 0, dt, 3)
    u.uHomogeneity.value = ease(u.uHomogeneity.value, brew?.homogeneity ?? 0, dt, 2)
    u.uBoil.value = ease(u.uBoil.value, reducedMotion ? 0 : BOIL[brew?.boil ?? 'leeg'], dt, 2)
    u.uOverflow.value = ease(u.uOverflow.value, brew?.overflow ?? 0, dt, 1.5)
    if (ladle.current) ladle.current.rotation.y = s.ladle
    if (flames.current && !reducedMotion) {
      const t = air.time.value
      flames.current.scale.set(1 + Math.sin(t * 9.1) * 0.04, 1 + Math.sin(t * 7.3) * 0.1 + Math.sin(t * 13.7) * 0.05, 1 + Math.sin(t * 8.3) * 0.04)
    }
  })

  return (
    <>
      <Piece name="cauldron" />
      <Piece name="cauldron-liquid" material={material} castShadow={false} />
      <group ref={ladle} position={LADLE_PIVOT as unknown as [number, number, number]}>
        <Piece name="ladle" hung />
      </group>
      <Piece ref={flames} name="flames" material={glow} castShadow={false} receiveShadow={false} />
      <Piece name="fire" />
    </>
  )
}
