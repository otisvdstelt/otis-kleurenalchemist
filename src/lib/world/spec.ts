// Waar alles staat in de werkplaats. Het bakscript en de app vragen het allebei aan dit bestand, zodat ze het eens zijn
// Eenheden zijn meters, y is omhoog, de achterwand staat achter, de camera kijkt vanaf de deur naar binnen

import type { JarShape } from '../alchemy/ingredients.ts'

export type Vec3 = readonly [number, number, number]

/** De kamer: vloer, achterwand en linkerwand */
export const ROOM = { left: -5.4, right: 5.4, back: -3.2, front: 2.6, height: 4.6 }

/** De ketel op zijn vuur */
export const CAULDRON = { at: [0, 0, -1.15] as Vec3, radius: 0.62, height: 0.72, lift: 0.26, rim: 0.035 }
/** Hoogte van het vloeistofoppervlak in de ketel */
export const LIQUID_Y = CAULDRON.lift + CAULDRON.height - 0.1

/** Drie planken tegen de achterwand, links van de ketel */
export const SHELVES = { x0: -4.7, x1: -1.05, z: -3.02, depth: 0.36, heights: [1.2, 1.92, 2.64] as const, thickness: 0.05 }

/** De werkbank rechts, met daarop de bijzondere potjes, de vijzel, boeken, kaarsen en het lege flesje */
export const BENCH = { x0: 1.25, x1: 3.9, z0: -2.55, z1: -1.55, top: 0.92 }

/** Het raam in de achterwand */
export const WINDOW = { x0: 1.55, x1: 3.35, y0: 1.75, y1: 3.55 }

/** Het flesje waar het palet in gaat, op de hoek van de werkbank bij de ketel */
export const FLASK = { at: [1.62, BENCH.top, -1.78] as Vec3, height: 0.42, radius: 0.13 }

/** De pollepel draait om het midden van de ketel */
export const LADLE_PIVOT: Vec3 = [CAULDRON.at[0], CAULDRON.lift + CAULDRON.height, CAULDRON.at[2]]

/** Waar de camera staat en waar hij naar kijkt, op een breed scherm en op een telefoon */
export const VIEWS = {
  wide: { position: [0.55, 2.35, 3.7] as Vec3, target: [-0.5, 1.25, -1.6] as Vec3, fov: 42 },
  tall: { position: [-0.4, 2.7, 4.9] as Vec3, target: [-0.6, 1.35, -1.5] as Vec3, fov: 58 },
}

// ============================================================ potjes

/** Basishoogte van een potje. De `hoogte` uit de JSON schaalt dit */
const JAR_HEIGHT = 0.3

export interface JarForm {
  /** De buitenkant van het glas, als [straal, hoogte] van onder naar boven */
  outline: [number, number][]
  /** Hoe hoog het glas is, en de straal van de mond waar de kurk in zit */
  height: number
  mouth: number
  /** Tot waar het poeder komt */
  fill: number
  /** Breedste straal, voor de ruimte op de plank */
  widest: number
}

/** Het profiel van een potje, per vorm */
export function jarForm(shape: JarShape, scale: number): JarForm {
  const h = JAR_HEIGHT * scale
  let outline: [number, number][]
  switch (shape) {
    case 'pot':
      outline = [[0, 0], [0.1, 0], [0.11, 0.012], [0.11, h * 0.86], [0.099, h * 0.94], [0.09, h]]
      break
    case 'slank':
      outline = [[0, 0], [0.058, 0], [0.065, 0.01], [0.065, h * 0.78], [0.05, h * 0.86], [0.04, h * 0.9], [0.04, h]]
      break
    case 'bol': {
      const body = h * 0.74
      outline = [[0, 0]]
      for (let k = 1; k <= 9; k++) {
        const t = (k / 10) * Math.PI * 0.9
        outline.push([0.11 * Math.sin(t), body / 2 - (body / 2) * Math.cos(t)])
      }
      outline.push([0.042, body * 0.99], [0.042, h])
      break
    }
    case 'buik':
      outline = [[0, 0], [0.115, 0], [0.122, 0.03], [0.112, h * 0.3], [0.085, h * 0.55], [0.05, h * 0.72], [0.045, h * 0.8], [0.045, h]]
      break
    case 'kolf':
      outline = [[0, 0], [0.112, 0], [0.118, 0.014], [0.05, h * 0.62], [0.04, h * 0.7], [0.04, h]]
      break
  }
  const mouth = outline[outline.length - 1][0]
  const widest = Math.max(...outline.map(([r]) => r))
  // Het poeder komt tot onder de hals
  const neck = outline.find(([r, y]) => y > h * 0.4 && r <= mouth * 1.15)?.[1] ?? h * 0.85
  return { outline, height: h, mouth, fill: Math.min(neck, h * 0.82) * 0.9, widest }
}

/** De straal van het glas op een hoogte */
export function radiusAt(form: JarForm, y: number): number {
  const o = form.outline
  for (let i = 1; i < o.length; i++) {
    if (y <= o[i][1]) {
      const [r0, y0] = o[i - 1]
      const [r1, y1] = o[i]
      return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0)
    }
  }
  return o[o.length - 1][0]
}

/** Het etiket zit op ongeveer een derde van de hoogte, net op het glas */
export function labelOf(form: JarForm): { y: number; out: number; width: number } {
  const y = Math.min(form.fill * 0.55, form.height * 0.4)
  return { y, out: radiusAt(form, y) + 0.004, width: Math.max(0.1, radiusAt(form, y) * 1.5) }
}

/**
 * Waar elk potje staat. Kleuren gaan op de planken, van boven naar beneden, links naar rechts.
 * De bijzondere potjes staan op de werkbank. Een beetje scheef en ongelijk, zoals in een echte werkplaats
 */
export function jarSlots(colours: readonly { id: string; widest: number }[], special: readonly { id: string; widest: number }[]): Map<string, { at: Vec3; turn: number }> {
  const slots = new Map<string, { at: Vec3; turn: number }>()
  const perShelf = Math.ceil(colours.length / SHELVES.heights.length)
  SHELVES.heights.forEach((y, shelf) => {
    // Van boven naar beneden
    const row = colours.slice((SHELVES.heights.length - 1 - shelf) * perShelf, (SHELVES.heights.length - shelf) * perShelf)
    const span = SHELVES.x1 - SHELVES.x0 - 0.3
    row.forEach((jar, i) => {
      const x = SHELVES.x0 + 0.15 + (span * (i + 0.5)) / row.length
      const wobble = Math.sin((i + 1) * 12.9898 + shelf * 78.233) * 0.5
      slots.set(jar.id, { at: [x + wobble * 0.05, y + SHELVES.thickness + tilt(shelf, x), SHELVES.z + 0.02 + wobble * 0.04], turn: wobble * 0.6 })
    })
  })
  special.forEach((jar, i) => {
    slots.set(jar.id, { at: [BENCH.x0 + 0.75 + i * 0.32, BENCH.top, BENCH.z1 - 0.28 - (i % 2) * 0.12], turn: i * 0.4 - 0.3 })
  })
  return slots
}

/** De planken hangen een beetje scheef: hoeveel hoger of lager de plank is op deze x */
export function tilt(shelf: number, x: number): number {
  const slope = [0.012, -0.018, 0.009][shelf] ?? 0
  return (x - (SHELVES.x0 + SHELVES.x1) / 2) * slope
}

// ============================================================ het flesje

/** De buitenkant van het flesje, als [straal, hoogte] */
export function flaskOutline(): [number, number][] {
  const { height: h, radius: r } = FLASK
  return [[0, 0], [r * 0.92, 0], [r, 0.015], [r, h * 0.55], [r * 0.85, h * 0.66], [r * 0.4, h * 0.76], [r * 0.3, h * 0.8], [r * 0.3, h * 0.97], [r * 0.36, h]]
}

/** Waar de vloeistof in het flesje zit: van de bodem tot de schouder */
export const FLASK_LIQUID = { bottom: 0.012, top: FLASK.height * 0.62 }
