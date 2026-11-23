import { AdditiveBlending, Color, DataTexture, DoubleSide, LinearFilter, LinearMipmapLinearFilter, MeshBasicMaterial, MeshToonMaterial, NearestFilter, RedFormat, RepeatWrapping, RGBAFormat, type ColorRepresentation } from 'three'
import { air } from '../../lib/air'
import { fbm } from '../../lib/world/noise'

/** Precies drie tonen, gelezen met nearest, zodat de ene nooit in de andere vervloeit */
export const toonGradient = (() => {
  const texture = new DataTexture(new Uint8Array([70, 168, 255]), 3, 1, RedFormat)
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.needsUpdate = true
  return texture
})()

/** Een tegel zachte vlekken die over elk geschilderd vlak ligt en de normaal een beetje buigt */
export const washTexture = (() => {
  const size = 128
  const data = new Uint8Array(size * size * 4)
  // De tegel gemengd met verschoven kopieën van zichzelf, zodat hij zonder naad herhaalt
  const tile = (x: number, y: number, scale: number, seed: number) => {
    const u = x / size
    const v = y / size
    const at = (dx: number, dy: number) => fbm((x + dx * size) * scale + seed, (y + dy * size) * scale + seed * 1.7, 4)
    return at(0, 0) * (1 - u) * (1 - v) + at(-1, 0) * u * (1 - v) + at(0, -1) * (1 - u) * v + at(-1, -1) * u * v
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 4
      data[o] = Math.round(tile(x, y, 0.045, 3) * 255)
      data[o + 1] = Math.round(tile(x, y, 0.13, 41) * 255)
      data[o + 2] = Math.round(tile(x, y, 0.3, 77) * 255)
      data[o + 3] = 255
    }
  }
  const texture = new DataTexture(data, size, size, RGBAFormat)
  texture.wrapS = texture.wrapT = RepeatWrapping
  texture.minFilter = LinearMipmapLinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
})()

/** De kleur waar de hele kamer naartoe neigt (de damp), gedeeld door elk geschilderd vlak */
export const tintUniform = { value: new Color(0, 0, 0) }
export const tintAmount = { value: 0 }

interface PaintOptions {
  color?: ColorRepresentation
  /** Doorzichtig glas, met een rand die het licht vangt */
  glass?: boolean
}

/** De ene manier van schilderen: cel shading vanuit de hoekpunten, met een was eroverheen */
export function paintedToon({ color = '#ffffff', glass = false }: PaintOptions = {}): MeshToonMaterial {
  const material = new MeshToonMaterial({ color, vertexColors: true, gradientMap: toonGradient })
  if (glass) {
    material.transparent = true
    material.opacity = 0.16
    material.depthWrite = false
    material.side = DoubleSide
  }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = air.time
    shader.uniforms.uWash = { value: washTexture }
    shader.uniforms.uTint = tintUniform
    shader.uniforms.uTintAmount = tintAmount
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPaintPos;\nvarying vec3 vPaintView;').replace(
      '#include <project_vertex>',
      /* glsl */ `#include <project_vertex>
        vPaintPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vPaintView = normalize(cameraPosition - vPaintPos);`,
    )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform sampler2D uWash;\nuniform vec3 uTint;\nuniform float uTintAmount;\nvarying vec3 vPaintPos;\nvarying vec3 vPaintView;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
          vec2 washUv = vPaintPos.xz * 0.35 + vPaintPos.y * 0.25;
          vec3 washed = texture2D(uWash, washUv).rgb;
          vec3 bleed = texture2D(uWash, washUv * 3.3 + 0.37).rgb;
          float wash = washed.r * 0.55 + bleed.g * 0.3 + washed.b * 0.15;
          diffuseColor.rgb *= 0.86 + wash * 0.28;
          // De damp kleurt de kamer een beetje mee
          diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * (0.55 + uTint * 0.9), uTintAmount);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        /* glsl */ `#include <normal_fragment_maps>
          // Het papier heeft een korrel, dus de grens tussen de tonen loopt rafelig
          normal = normalize(normal + (vec3(bleed.r, washed.g, bleed.b) - 0.5) * 0.34);`,
      )
    if (glass) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        /* glsl */ `// Glas vangt het licht aan de rand, waar je er schuin door kijkt
          float rim = 1.0 - abs(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)));
          outgoingLight += vec3(1.0, 0.97, 0.9) * smoothstep(0.6, 0.97, rim) * 0.6;
          diffuseColor.a = clamp(diffuseColor.a + smoothstep(0.7, 1.0, rim) * 0.5, 0.0, 1.0);
          #include <opaque_fragment>`,
      )
    }
  }
  material.customProgramCacheKey = () => `painted-${glass ? 'glass' : 'solid'}`
  return material
}

/** Het meeste van de werkplaats deelt deze */
export const paint = paintedToon()
/** Potjes en het flesje */
export const glass = paintedToon({ glass: true, color: '#eef6f2' })

/** Vlammen en kaarsen, onbelicht: een vlam is zijn eigen licht */
export const glow = new MeshBasicMaterial({ color: '#ffffff', vertexColors: true, toneMapped: false })
/** Het licht in de ruiten, overdag hemel, 's nachts donkerblauw */
export const windowGlow = new MeshBasicMaterial({ color: '#ffffff', vertexColors: true })

/** Een bundel licht door stoffige lucht, opgeteld bij wat erachter ligt */
export const shaft = new MeshBasicMaterial({ color: '#ffffff', vertexColors: true, transparent: true, opacity: 0.32, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })

const glowDay = new Color('#f2d79c')
const glowNight = new Color('#ffe7b0').multiplyScalar(1.6)
const paneDay = new Color('#f4f1dc')
const paneNight = new Color('#1f2a52')
const shaftDay = new Color('#ffffff')
const shaftNight = new Color('#000000')

/** Overdag zijn de vlammen bleek en schijnt de zon naar binnen, 's nachts gloeit alles */
export function setGlow(night: number) {
  glow.color.copy(glowDay).lerp(glowNight, night)
  windowGlow.color.copy(paneDay).lerp(paneNight, night)
  shaft.color.copy(shaftDay).lerp(shaftNight, night)
}
