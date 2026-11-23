import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { FogExp2 } from 'three'
import { air, type Phase } from '../../lib/air'
import { currentBrew, store } from '../../lib/store'
import { look } from './look'
import { motion } from './motion'

/**
 * De werkplaats tekent alleen als er iets verandert (frameloop demand). Dit vraagt om een nieuw frame zolang
 * er nog iets onderweg is: het uur, de onthulling, een potje, het inschenken, of een ketel die borrelt en dampt
 */
export function Pulse({ phase, reducedMotion }: { phase: Phase; reducedMotion: boolean }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => store.subscribe(() => invalidate()), [invalidate])
  useFrame(() => {
    const target = phase === 'night' ? 1 : 0
    const settling = Math.abs(air.night.value - target) > 0.002 || air.reveal.value < 1 || air.wipe.value !== 0
    // Een ketel met iets erin dampt en borrelt, dus die blijft leven. Met minder beweging staat hij stil
    const brewing = !reducedMotion && currentBrew() !== null
    if (settling || brewing || motion.awake()) invalidate()
  })
  return null
}

/** De eerste keer verschijnt het beeld als verf die vanuit het midden uitloopt */
export function Reveal({ reducedMotion }: { reducedMotion: boolean }) {
  useEffect(() => {
    air.wipe.value = 0
    air.reveal.value = reducedMotion ? 1 : 0
  }, [reducedMotion])
  useFrame((_, delta) => {
    if (air.wipe.value === 0 && air.reveal.value < 1) air.reveal.value = Math.min(1, air.reveal.value + Math.min(delta, 0.05) / 2.2)
  })
  return null
}

/** Een beetje waas in de kamer, in de kleur van het uur */
export function Haze() {
  const scene = useThree((s) => s.scene)
  const fog = useMemo(() => new FogExp2('#e9dfc9', 0.035), [])
  useEffect(() => {
    scene.fog = fog
    return () => {
      scene.fog = null
    }
  }, [scene, fog])
  useFrame(() => {
    fog.color.copy(look.fog)
  })
  return null
}
