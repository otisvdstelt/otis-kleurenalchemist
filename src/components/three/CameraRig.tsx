import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3, type PerspectiveCamera } from 'three'
import { CAULDRON, LIQUID_Y, VIEWS } from '../../lib/world/spec'

/** Waar de ketel op het scherm staat, in CSS-pixels: het midden en de twee stralen van de ellips */
export interface CauldronOnScreen {
  x: number
  y: number
  rx: number
  ry: number
}

const centre = new Vector3()
const edge = new Vector3()
const front = new Vector3()

/** Zet de camera op zijn plek: breed of staand, naar het scherm. En zegt waar de ketel nu op het scherm staat */
export function CameraRig({ onCauldron }: { onCauldron: (where: CauldronOnScreen) => void }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera
  const size = useThree((s) => s.size)
  const invalidate = useThree((s) => s.invalidate)
  const last = useRef<CauldronOnScreen | null>(null)

  useEffect(() => {
    const view = size.width / size.height < 0.9 ? VIEWS.tall : VIEWS.wide
    camera.position.set(...view.position)
    camera.fov = view.fov
    camera.lookAt(...view.target)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
    invalidate()
  }, [camera, size, invalidate])

  // Eén frame na het verzetten weet de camera waar alles staat
  useFrame(() => {
    const [cx, , cz] = CAULDRON.at
    const r = CAULDRON.radius
    const toScreen = (v: Vector3) => v.project(camera)
    const c = toScreen(centre.set(cx, LIQUID_Y, cz))
    const e = toScreen(edge.set(cx + r, LIQUID_Y, cz))
    const f = toScreen(front.set(cx, LIQUID_Y, cz + r))
    const px = (v: Vector3) => [((v.x + 1) / 2) * size.width, ((1 - v.y) / 2) * size.height] as const
    const [x, y] = px(c)
    const [ex] = px(e)
    const [, fy] = px(f)
    const next = { x, y, rx: Math.abs(ex - x), ry: Math.abs(fy - y) }
    const before = last.current
    if (!before || Math.abs(before.x - next.x) + Math.abs(before.y - next.y) + Math.abs(before.rx - next.rx) > 0.5) {
      last.current = next
      onCauldron(next)
    }
  })
  return null
}
