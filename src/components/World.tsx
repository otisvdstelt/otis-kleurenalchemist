import { Canvas } from '@react-three/fiber'
import { EffectComposer } from '@react-three/postprocessing'
import { PerformanceMonitor } from '@react-three/drei'
import { use, useEffect, useState } from 'react'
import type { Phase } from '../lib/air'
import { VIEWS } from '../lib/world/spec'
import { lettering, PartsContext, useWorkshopModel } from './three/assets'
import { Atmosphere } from './three/Atmosphere'
import { CameraRig, type CauldronOnScreen, type View } from './three/CameraRig'
import { InkPaper } from './three/InkPaper'
import { look } from './three/look'
import { Haze, Pulse, Reveal } from './three/Pulse'
import { Workshop } from './three/Workshop'

export type { CauldronOnScreen, View }

export interface WorldProps {
  phase: Phase
  /** Bij de ketel, of bij de plank met flesjes */
  view: View
  reducedMotion: boolean
  /** Een telefoon of een zuinig apparaat krijgt minder pixels en kleinere schaduwen */
  modest: boolean
  onReady: () => void
  onCauldron: (where: CauldronOnScreen | null) => void
  /** Er is een flesje van de plank gepakt */
  onOpenBottle: () => void
}

// Wat elk soort apparaat moet tekenen
const BUDGET = {
  full: { dpr: [1, 1.75] as [number, number], shadow: 2048 },
  modest: { dpr: [1, 1.25] as [number, number], shadow: 1024 },
}

/** De werkplaats in 3D. Alleen weergave: hij leest de store en stuurt intenties terug */
export default function World({ phase, view, reducedMotion, modest, onReady, onCauldron, onOpenBottle }: WorldProps) {
  const parts = useWorkshopModel()
  use(lettering)
  const budget = modest ? BUDGET.modest : BUDGET.full
  // Haalt het apparaat de 60 beelden per seconde niet, dan gaan er pixels af. Gaat het weer goed, dan komen ze terug
  const [dpr, setDpr] = useState(budget.dpr[1])

  useEffect(() => {
    onReady()
    return () => {
      document.body.style.cursor = ''
    }
    // De werkplaats komt één keer binnen
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Canvas
      shadows="percentage"
      flat
      frameloop="demand"
      dpr={[1, dpr]}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: VIEWS.wide.fov, near: 0.1, far: 40, position: VIEWS.wide.position as [number, number, number] }}
      onCreated={(state) => {
        state.gl.setClearColor(look.paper)
        if (import.meta.env.DEV) (window as unknown as { __werkplaats?: unknown }).__werkplaats = state
      }}
    >
      <PerformanceMonitor bounds={() => [50, 62]} flipflops={3} onDecline={() => setDpr((d) => Math.max(0.75, d - 0.25))} onIncline={() => setDpr((d) => Math.min(budget.dpr[1], d + 0.25))} onFallback={() => setDpr(0.75)} />
      <PartsContext value={parts}>
        <CameraRig view={view} reducedMotion={reducedMotion} onCauldron={onCauldron} />
        <Atmosphere phase={phase} shadowSize={budget.shadow} />
        <Haze />
        <Workshop reducedMotion={reducedMotion} onOpenBottle={onOpenBottle} />
        <Pulse phase={phase} reducedMotion={reducedMotion} />
        <Reveal reducedMotion={reducedMotion} />
        <EffectComposer multisampling={0} enableNormalPass={false}>
          <InkPaper />
        </EffectComposer>
      </PartsContext>
    </Canvas>
  )
}
