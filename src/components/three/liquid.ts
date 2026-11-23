import { Color, DoubleSide, ShaderMaterial, Uniform } from 'three'
import { air } from '../../lib/air'
import { luminance } from '../../lib/alchemy/contrast'
import type { Swatch } from '../../lib/alchemy/palette'
import { CAULDRON, FLASK_LIQUID } from '../../lib/world/spec'

/** Hoeveel strepen de draaikolk hooguit tegelijk laat zien, en hoeveel lagen een flesje heeft */
export const MAX_STREAKS = 12
export const MAX_LAYERS = 7

const NOISE = /* glsl */ `
  float lqHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float lqNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(lqHash(i), lqHash(i + vec2(1.0, 0.0)), f.x), mix(lqHash(i + vec2(0.0, 1.0)), lqHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float lqFbm(vec2 p) {
    float sum = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 4; i++) {
      sum += amplitude * lqNoise(p);
      p = p * 2.03 + 7.1;
      amplitude *= 0.5;
    }
    return sum;
  }
`

const colours = (n: number) => Array.from({ length: n }, () => new Color())

/**
 * Het oppervlak in de ketel. De kleuren van de ingrediënten zijn strepen die in een draaikolk meedraaien
 * (fbm-ruis, polair gedraaid), en die langzaam opgaan in de mengkleur naarmate er geroerd is.
 * De kleuren zelf komen uit de kleurkern: dit tekent ze alleen
 */
export function cauldronLiquid() {
  return new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uStreaks: new Uniform(colours(MAX_STREAKS)),
      uWeights: new Uniform(new Array<number>(MAX_STREAKS).fill(0)),
      uCount: new Uniform(0),
      uBlend: new Uniform(new Color('#3f4a45')),
      uEmpty: new Uniform(new Color('#3d4743')),
      uMud: new Uniform(new Color('#6b5038')),
      uFilled: new Uniform(0),
      uHomogeneity: new Uniform(0),
      uSwirl: new Uniform(0),
      uBoil: new Uniform(0),
      uOverflow: new Uniform(0),
      uTime: air.time,
      uNight: air.night,
    },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() {
        vP = position.xz / ${(CAULDRON.radius * 0.91).toFixed(4)};
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uStreaks[${MAX_STREAKS}];
      uniform float uWeights[${MAX_STREAKS}];
      uniform int uCount;
      uniform vec3 uBlend;
      uniform vec3 uEmpty;
      uniform vec3 uMud;
      uniform float uFilled;
      uniform float uHomogeneity;
      uniform float uSwirl;
      uniform float uBoil;
      uniform float uOverflow;
      uniform float uTime;
      uniform float uNight;
      varying vec2 vP;
      ${NOISE}

      void main() {
        float r = length(vP);
        if (r > 1.0) discard;
        float a = atan(vP.y, vP.x);
        // De draaikolk: binnen draait sneller dan buiten, en de armen lopen in een spiraal
        float a2 = a + uSwirl * (1.35 - r) + r * 2.2;
        vec2 q = vec2(cos(a2), sin(a2)) * (0.4 + r * 1.1);
        float n = clamp((lqFbm(q * 0.85 + vec2(0.0, uTime * 0.03)) - 0.25) / 0.5, 0.0, 0.999);

        // Welke streep: naar gewicht verdeeld over de ruis
        vec3 colour = uStreaks[0];
        float edge = 0.0;
        for (int i = 0; i < ${MAX_STREAKS}; i++) {
          if (i >= uCount) break;
          edge += uWeights[i];
          if (n < edge) {
            colour = uStreaks[i];
            break;
          }
        }
        colour = mix(colour, uBlend, smoothstep(0.0, 1.0, uHomogeneity));

        // Een beetje schaduw tegen de wand, en glans in het midden
        colour *= 0.8 + 0.2 * (1.0 - r * r);
        colour += vec3(1.0, 0.96, 0.88) * smoothstep(0.08, 0.0, abs(r - 0.42 - 0.05 * sin(a * 3.0 + uSwirl))) * 0.08;

        // Bellen die opkomen en knappen, meer als het onrustig is
        vec2 cell = vP * 6.0;
        vec2 id = floor(cell);
        float h = lqHash(id);
        float life = fract(uTime * (0.35 + h * 0.5) + h * 9.0);
        float shown = step(1.0 - uBoil * 0.55, lqHash(id + floor(uTime * 0.3 + h * 4.0)));
        float d = length(fract(cell) - 0.5 - (vec2(lqHash(id + 3.1), lqHash(id + 7.7)) - 0.5) * 0.4);
        float bubble = smoothstep(0.03, 0.0, abs(d - life * 0.22)) * shown * (1.0 - life);
        colour = mix(colour, vec3(1.0), bubble * 0.5 * uFilled);

        // Overkoken: modder kruipt vanaf de rand naar binnen, met schuim erop
        float creep = smoothstep(1.0 - uOverflow * 0.75, 1.02, r + (lqFbm(vP * 4.0 + uTime * 0.08) - 0.5) * 0.25);
        colour = mix(colour, uMud, creep * 0.92);
        float foam = smoothstep(0.58, 0.66, lqFbm(vP * 8.0 + vec2(uTime * 0.25, 0.0))) * smoothstep(0.5, 0.95, r) * uOverflow;
        colour = mix(colour, vec3(0.86, 0.81, 0.7), foam);

        colour = mix(uEmpty, colour, uFilled);
        // 's Nachts licht de ketel een beetje op
        colour *= 1.0 + uNight * 0.22;
        gl_FragColor = vec4(colour, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}

/**
 * De vloeistof in het flesje, in lagen: één per kleur, de zwaarste onderop.
 * Bij het inschenken lopen de lagen in elkaar over (uStir) en trekken ze daarna weer uit elkaar
 */
export function flaskLiquid() {
  return new ShaderMaterial({
    side: DoubleSide,
    uniforms: {
      uLayers: new Uniform(colours(MAX_LAYERS)),
      uCount: new Uniform(1),
      uFill: new Uniform(0),
      uStir: new Uniform(0),
      uTime: air.time,
      uNight: air.night,
    },
    vertexShader: /* glsl */ `
      varying float vT;
      varying float vAngle;
      varying vec3 vNormalView;
      void main() {
        vT = (position.y - ${FLASK_LIQUID.bottom.toFixed(4)}) / ${(FLASK_LIQUID.top - FLASK_LIQUID.bottom).toFixed(4)};
        vAngle = atan(position.z, position.x);
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uLayers[${MAX_LAYERS}];
      uniform int uCount;
      uniform float uFill;
      uniform float uStir;
      uniform float uTime;
      uniform float uNight;
      varying float vT;
      varying float vAngle;
      varying vec3 vNormalView;
      ${NOISE}

      void main() {
        // Het oppervlak golft een beetje zolang er geklotst wordt
        float slosh = sin(vAngle * 2.0 + uTime * 5.0) * 0.04 * uStir;
        if (vT > uFill + slosh) discard;
        float count = float(uCount);
        // Grenzen tussen de lagen lopen in elkaar over zolang het klotst
        float wobble = (lqFbm(vec2(vAngle * 1.6, vT * 4.0 - uTime * 0.8)) - 0.5) * 2.4 * uStir;
        float at = clamp(vT * count + wobble, 0.0, count - 0.001);
        vec3 colour = uLayers[0];
        vec3 mean = vec3(0.0);
        for (int i = 0; i < ${MAX_LAYERS}; i++) {
          if (i >= uCount) break;
          if (int(floor(at)) == i) colour = uLayers[i];
          mean += uLayers[i];
        }
        colour = mix(colour, mean / count, uStir * 0.55);
        // Wat licht van voren, en de achterkant van het glas wat donkerder
        float facing = gl_FrontFacing ? 1.0 : 0.72;
        colour *= (0.82 + 0.18 * max(vNormalView.z, 0.0)) * facing;
        colour *= 1.0 + uNight * 0.15;
        gl_FragColor = vec4(colour, 1.0);
        #include <colorspace_fragment>
      }
    `,
  })
}

/** Zet de lagen in de shader: de zwaarste (donkerste) onderop */
export function setLayers(material: ShaderMaterial, swatches: readonly Swatch[]) {
  const layers = [...swatches].sort((a, b) => luminance(a.hex) - luminance(b.hex)).slice(0, MAX_LAYERS)
  layers.forEach((s, i) => (material.uniforms.uLayers.value as Color[])[i].set(s.hex))
  material.uniforms.uCount.value = Math.max(1, layers.length)
}
