import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { FogExp2 } from 'three'
import { air, type Phase } from '../../lib/air'
import { store } from '../../lib/store'
import { look } from './look'

/**
 * Tekent alleen als er iets verandert (frameloop demand). Dit vraagt om een nieuw frame
 * zolang er nog iets onderweg is: het uur, de onthulling, de kleur van de kamer, of de ketel zelf
 */
export function Pulse({ phase }: { phase: Phase }) {
  const invalidate = useThree((s) => s.invalidate)
  useEffect(() => store.subscribe(() => invalidate()), [invalidate])
  useFrame(() => {
    const target = phase === 'night' ? 1 : 0
    const settling = Math.abs(air.night.value - target) > 0.002 || air.reveal.value < 1
    if (settling) invalidate()
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
    if (air.reveal.value < 1) air.reveal.value = Math.min(1, air.reveal.value + Math.min(delta, 0.05) / 2.2)
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

