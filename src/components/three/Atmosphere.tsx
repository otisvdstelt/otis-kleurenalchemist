import { useFrame } from '@react-three/fiber'
import { useRef, useState } from 'react'
import { Color, type DirectionalLight, type HemisphereLight, type PointLight } from 'three'
import { air, type Phase } from '../../lib/air'
import { CAULDRON, WINDOW, ROOM } from '../../lib/world/spec'
import { look } from './look'
import { setGlow, tintAmount, tintUniform } from './materials'

const c = (hex: string) => new Color(hex)

// Overdag valt er licht door het raam. 's Nachts doen het vuur en de kaarsen het werk
const DAY = { hemiSky: c('#fbf1dc'), hemiGround: c('#a08266'), hemi: 2.3, sun: c('#ffe6b8'), sunPower: 2.8, fire: 0.6, paper: c('#f7f4eb'), ink: c('#1c1917'), fog: c('#e9dfc9') }
const NIGHT: typeof DAY = { hemiSky: c('#4a5488'), hemiGround: c('#1d1a26'), hemi: 0.55, sun: c('#a9bfff'), sunPower: 0.35, fire: 3.2, paper: c('#171b2e'), ink: c('#070914'), fog: c('#1d2036') }

const ease = (from: number, to: number, delta: number, rate: number) => from + (to - from) * (1 - Math.exp(-delta * rate))
const wanted = new Color()

interface AtmosphereProps {
  phase: Phase
  /** Hoe groot de schaduwkaart is, kleiner op een telefoon */
  shadowSize: number
}

/** Het licht, het uur en de klok die elke shader leest */
export function Atmosphere({ phase, shadowSize }: AtmosphereProps) {
  const hemi = useRef<HemisphereLight>(null)
  const sun = useRef<DirectionalLight>(null)
  const fire = useRef<PointLight>(null)
  const night = phase === 'night'

  // De werkplaats opent al in zijn uur. Daarna valt de nacht geleidelijk
  useState(() => {
    air.night.value = night ? 1 : 0
  })

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    air.time.value += dt
    air.night.value = ease(air.night.value, night ? 1 : 0, Math.min(delta, 1), 1.6)
    const dusk = air.night.value

    look.paper.copy(DAY.paper).lerp(NIGHT.paper, dusk)
    look.ink.copy(DAY.ink).lerp(NIGHT.ink, dusk)
    look.fog.copy(DAY.fog).lerp(NIGHT.fog, dusk)

    // De kamer neigt naar de kleur van de damp
    tintAmount.value = ease(tintAmount.value, air.tint.amount, dt, 2.5)
    tintUniform.value.lerp(wanted.setRGB(air.tint.r, air.tint.g, air.tint.b), 1 - Math.exp(-dt * 3))

    if (hemi.current) {
      hemi.current.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, dusk)
      hemi.current.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, dusk)
      hemi.current.intensity = DAY.hemi + (NIGHT.hemi - DAY.hemi) * dusk
    }
    if (sun.current) {
      sun.current.color.copy(DAY.sun).lerp(NIGHT.sun, dusk)
      sun.current.intensity = DAY.sunPower + (NIGHT.sunPower - DAY.sunPower) * dusk
    }
    if (fire.current) fire.current.intensity = DAY.fire + (NIGHT.fire - DAY.fire) * dusk
    setGlow(dusk)
  }, -3)

  const windowMid: [number, number, number] = [(WINDOW.x0 + WINDOW.x1) / 2, (WINDOW.y0 + WINDOW.y1) / 2, ROOM.back]
  return (
    <>
      <hemisphereLight ref={hemi} args={['#f6ead0', '#7d5f45', DAY.hemi]} />
      {/* Licht door het raam, schuin naar binnen */}
      <directionalLight ref={sun} position={[windowMid[0] + 1.5, windowMid[1] + 2.5, windowMid[2] - 3]} color="#ffe2b0" intensity={DAY.sunPower} castShadow shadow-mapSize={[shadowSize, shadowSize]} shadow-bias={-0.0006} shadow-normalBias={0.03}>
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.5, 20]} />
      </directionalLight>
      {/* Het vuur onder de ketel */}
      <pointLight ref={fire} position={[CAULDRON.at[0], 0.35, CAULDRON.at[2] + 0.4]} color="#ff9a4a" intensity={DAY.fire} distance={6} decay={1.6} />
    </>
  )
}
