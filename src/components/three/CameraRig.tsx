import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { air } from '../../lib/air'
import { CAULDRON, LIQUID_Y, VIEWS } from '../../lib/world/spec'
import { motion } from './motion'

/** Waar de ketel op het scherm staat, in CSS-pixels: het midden en de twee stralen van de ellips */
export interface CauldronOnScreen {
  x: number
  y: number
  rx: number
  ry: number
}

export type View = 'werkplaats' | 'plank'

const centre = new Vector3()
const edge = new Vector3()
const front = new Vector3()

/** Hoe lang de mist erover rolt, en hoe lang hij er weer af trekt */
const FOG_IN = 0.85
const FOG_OFF = 1.1

interface CameraRigProps {
  view: View
  reducedMotion: boolean
  onCauldron: (where: CauldronOnScreen | null) => void
}

/**
 * Zet de camera op zijn plek: breed of staand, bij de ketel of bij de plank. Tussen die twee rolt de mist erover,
 * zoals in het portfolio. En hij zegt waar de ketel nu op het scherm staat
 */
export function CameraRig({ view, reducedMotion, onCauldron }: CameraRigProps) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const last = useRef<CauldronOnScreen | null>(null)
  const shown = useRef<View>(view)
  const travel = useRef<{ to: View; phase: 'in' | 'off'; t: number } | null>(null)

  const place = (at: View) => {
    const tall = size.width / size.height < 0.9
    const v = at === 'plank' ? (tall ? VIEWS.plankTall : VIEWS.plank) : tall ? VIEWS.tall : VIEWS.wide
    camera.position.set(...v.position)
    camera.fov = v.fov
    camera.lookAt(...v.target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    shown.current = at
    invalidate()
  }

  // Bij een andere maat van het scherm: meteen goed zetten
  useEffect(() => {
    place(shown.current)
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, size])

  // Een ander uitzicht: met minder beweging meteen, anders door de mist
  useEffect(() => {
    if (view === shown.current && !travel.current) return
    if (reducedMotion) {
      travel.current = null
      air.wipe.value = 0
      air.reveal.value = 1
      place(view)
      return
    }
    travel.current = { to: view, phase: 'in', t: 0 }
    air.wipe.value = 1
    motion.wake(FOG_IN + FOG_OFF + 0.5)
    invalidate()
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [view, reducedMotion])

  useFrame((_, delta) => {
    const trip = travel.current
    if (trip) {
      trip.t += Math.min(delta, 0.05)
      if (trip.phase === 'in') {
        air.reveal.value = Math.max(0, 1 - trip.t / FOG_IN)
        if (trip.t >= FOG_IN) {
          place(trip.to)
          trip.phase = 'off'
          trip.t = 0
          air.wipe.value = 2
        }
      } else {
        air.reveal.value = Math.min(1, trip.t / FOG_OFF)
        if (trip.t >= FOG_OFF) {
          travel.current = null
          air.wipe.value = 0
          air.reveal.value = 1
        }
      }
    }

    // Waar de ketel staat, als hij in beeld is
    const [cx, , cz] = CAULDRON.at
    const r = CAULDRON.radius
    const c = centre.set(cx, LIQUID_Y, cz).project(camera)
    const e = edge.set(cx + r, LIQUID_Y, cz).project(camera)
    const f = front.set(cx, LIQUID_Y, cz + r).project(camera)
    const px = (v: Vector3) => [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height] as const
    const [x, y] = px(c)
    const [ex] = px(e)
    const [, fy] = px(f)
    const visible = shown.current === 'werkplaats' && c.z < 1 && y < size.height + 50
    const next = visible ? { x, y, rx: Math.abs(ex - x), ry: Math.abs(fy - y) } : null
    const before = last.current
    const moved = !before || !next ? before !== next : Math.abs(before.x - next.x) + Math.abs(before.y - next.y) + Math.abs(before.rx - next.rx) > 0.5
    if (moved) {
      last.current = next
      onCauldron(next)
    }
  })
  return null
}
