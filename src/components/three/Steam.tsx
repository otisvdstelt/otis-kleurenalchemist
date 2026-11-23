import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Color, NormalBlending, PlaneGeometry, ShaderMaterial, Uniform, type Mesh } from 'three'
import { air } from '../../lib/air'
import { useBrew } from '../../lib/store'
import { CAULDRON, LIQUID_Y } from '../../lib/world/spec'

const PUFFS = 7
const plane = new PlaneGeometry(1, 1)

function puffMaterial(seed: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
    uniforms: { uColour: new Uniform(new Color('#e9e3d6')), uAlpha: new Uniform(0), uSeed: new Uniform(seed), uTime: air.time, uNight: air.night },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColour;
      uniform float uAlpha;
      uniform float uSeed;
      uniform float uTime;
      uniform float uNight;
      varying vec2 vUv;
      float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float n(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * n(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
      void main() {
        vec2 p = vUv - 0.5;
        float cloud = fbm(vUv * 3.0 + vec2(uSeed * 7.0, -uTime * 0.12 + uSeed));
        float shape = smoothstep(0.5, 0.15, length(p) + (cloud - 0.5) * 0.35);
        float alpha = shape * smoothstep(0.32, 0.62, cloud + 0.25) * uAlpha;
        // 's Nachts licht de damp een beetje op, alsof het vuur erdoor schijnt
        vec3 colour = uColour * (1.0 + uNight * 0.35);
        gl_FragColor = vec4(colour, alpha);
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Damp uit de ketel, ingekleurd naar het palet. Hier zie je het palet voor het eerst */
export function Steam({ reducedMotion }: { reducedMotion: boolean }) {
  const brew = useBrew()
  const materials = useMemo(() => Array.from({ length: PUFFS }, (_, i) => puffMaterial(i * 1.37)), [])
  const meshes = useRef<(Mesh | null)[]>([])
  const strength = useRef(0)

  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials])

  useEffect(() => {
    const hexes = brew ? brew.swatches.map((s) => s.hex) : []
    materials.forEach((m, i) => (m.uniforms.uColour.value as Color).set(hexes.length ? hexes[i % hexes.length] : '#e9e3d6'))
  }, [brew, materials])

  useFrame(({ camera }, delta) => {
    strength.current += ((brew ? 1 : 0) - strength.current) * (1 - Math.exp(-Math.min(delta, 0.1) * 1.5))
    const [cx, , cz] = CAULDRON.at
    meshes.current.forEach((mesh, i) => {
      if (!mesh) return
      // Elke wolk stijgt op, wordt groter en lost op, en begint dan opnieuw. Zonder beweging hangen ze stil
      const t = reducedMotion ? (i + 0.5) / PUFFS : (air.time.value * 0.09 + i / PUFFS) % 1
      mesh.position.set(cx + Math.sin(i * 2.1 + t * 2.5) * 0.28 * t + (i % 3) * 0.08 - 0.08, LIQUID_Y + 0.12 + t * 1.6, cz + Math.cos(i * 1.7) * 0.18)
      const size = 0.4 + t * 0.85
      mesh.scale.set(size, size, size)
      mesh.quaternion.copy(camera.quaternion)
      ;(mesh.material as ShaderMaterial).uniforms.uAlpha.value = Math.sin(Math.PI * t) * 0.5 * strength.current
      mesh.visible = strength.current > 0.01
    })
  })

  return (
    <>
      {materials.map((material, i) => (
        <mesh key={i} ref={(m) => void (meshes.current[i] = m)} geometry={plane} material={material} renderOrder={4} />
      ))}
    </>
  )
}
