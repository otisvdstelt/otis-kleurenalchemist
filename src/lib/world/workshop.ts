// De werkplaats, in code gebouwd. npm run world bakt dit tot één Draco-.glb met benoemde stukken.
// De app zoekt de stukken op naam op en geeft ze hun eigen materiaal

import type { BufferGeometry } from 'three'
import { isSpecial, jarLayers, type Ingredient } from '../alchemy/ingredients.ts'
import { bands, blob, box, cone, cyl, extrude, lathe, limb, part, put, ring, roughen, slab, type Part, type Tint } from './kit.ts'
import { seeded } from './noise.ts'
import { BENCH, CAULDRON, FLASK, FLASK_LIQUID, flaskOutline, jarForm, jarSlots, LADLE_PIVOT, labelOf, LIQUID_Y, radiusAt, ROOM, SHELVES, tilt, WINDOW, type Vec3 } from './spec.ts'

// De kleuren van de werkplaats zelf: perkament, inkt, mos, mist, terracotta, en het hout en ijzer dat ertussen ligt
const C = {
  parchment: '#f7f4eb',
  paper: '#efe4c8',
  ink: '#2c2823',
  moss: '#3b533e',
  mist: '#a3c1ad',
  terracotta: '#b8623b',
  rust: '#8f4526',
  plaster: '#e2d6bd',
  plasterLow: '#c9b996',
  floor: ['#7a573a', '#86633f', '#6f4f35'] as const,
  wood: '#6b4a33',
  woodDark: '#4e3423',
  iron: '#3a332e',
  ironLight: '#4c443c',
  stone: '#8d8577',
  cork: '#b07a4a',
  wax: '#efe2c4',
  owl: '#7a5a3f',
}

// ============================================================ de kamer

export function buildRoom(): Part[] {
  const { left, right, back, front, height } = ROOM
  const pieces: BufferGeometry[] = []
  // Vloerplanken, elk een tikje anders
  const plank = 0.42
  for (let x = left, i = 0; x < right; x += plank, i++) {
    pieces.push(roughen(slab(x + 0.006, x + plank - 0.006, -0.08, 0, back, front, C.floor[i % 3]), 0.006, i))
  }
  // De achterwand, om het raam heen
  const wall: Tint = [C.plasterLow, C.plaster]
  const depth = 0.18
  pieces.push(slab(left, WINDOW.x0, 0, height, back - depth, back, wall))
  pieces.push(slab(WINDOW.x1, right, 0, height, back - depth, back, wall))
  pieces.push(slab(WINDOW.x0, WINDOW.x1, 0, WINDOW.y0, back - depth, back, wall))
  pieces.push(slab(WINDOW.x0, WINDOW.x1, WINDOW.y1, height, back - depth, back, wall))
  // De linkerwand
  pieces.push(slab(left - depth, left, 0, height, back - depth, front, wall))
  // Plinten
  pieces.push(slab(left, right, 0, 0.12, back, back + 0.03, C.woodDark))
  pieces.push(slab(left, left + 0.03, 0, 0.12, back, front, C.woodDark))
  // Balken onder het plafond, en een staander in de hoek
  for (const z of [-2.4, -0.6, 1.2]) pieces.push(roughen(slab(left, right, height - 0.26, height - 0.02, z - 0.13, z + 0.13, C.woodDark), 0.012, z * 10))
  pieces.push(roughen(slab(left, left + 0.24, 0, height, back, back + 0.24, C.woodDark), 0.01, 3))
  // Een paar stenen die door het pleister heen komen
  const random = seeded(11)
  for (let i = 0; i < 9; i++) {
    const x = left + 0.4 + random() * (right - left - 0.8)
    const y = 0.3 + random() * 0.9
    pieces.push(blob(0.09 + random() * 0.06, C.plasterLow, { at: [x, y, back - 0.02], scale: [1.4, 0.7, 0.2] }, 0.25, i))
  }
  return [part('room', pieces)]
}

export function buildWindow(): Part[] {
  const { x0, x1, y0, y1 } = WINDOW
  const z = ROOM.back
  const frame: BufferGeometry[] = []
  const t = 0.08
  frame.push(slab(x0 - t, x1 + t, y0 - t, y0, z - 0.2, z + 0.06, C.wood))
  frame.push(slab(x0 - t, x1 + t, y1, y1 + t, z - 0.2, z + 0.04, C.wood))
  frame.push(slab(x0 - t, x0, y0, y1, z - 0.2, z + 0.04, C.wood))
  frame.push(slab(x1, x1 + t, y0, y1, z - 0.2, z + 0.04, C.wood))
  // Roeden in een kruis
  const mx = (x0 + x1) / 2
  const my = (y0 + y1) / 2
  frame.push(slab(mx - 0.025, mx + 0.025, y0, y1, z - 0.12, z - 0.07, C.woodDark))
  frame.push(slab(x0, x1, my - 0.025, my + 0.025, z - 0.12, z - 0.07, C.woodDark))
  // Een vensterbank met een plantje in een terracotta pot
  frame.push(slab(x0 - 0.16, x1 + 0.16, y0 - 0.1, y0 - 0.04, z - 0.02, z + 0.2, C.wood))
  frame.push(cyl(0.09, 0.07, 0.14, C.terracotta, { at: [x0 + 0.35, y0 - 0.04, z + 0.1] }))
  frame.push(blob(0.12, C.moss, { at: [x0 + 0.35, y0 + 0.16, z + 0.1], scale: [1, 0.9, 1] }, 0.35, 4))
  // Het licht in de ruiten. De app kleurt het naar het uur
  const pane = slab(x0, x1, y0, y1, z - 0.16, z - 0.14, '#ffffff')
  // Twee bundels zonlicht schuin door de kamer, naar de ketel toe. Van boven helder, aan de voet niks
  const shafts: BufferGeometry[] = []
  for (const [dx, w] of [
    [0.45, 0.55],
    [1.25, 0.4],
  ] as const) {
    // Een balk die van het raam schuin omlaag de kamer in valt: bovenaan helder, aan de voet niks
    const beam = box(w, 4.2, 0.5, ['#000000', '#fff0cc'], { at: [0, -4.2, 0] })
    put(beam, { rot: [-0.85, 0, 0.3], at: [x0 + dx, y1 - 0.15, z + 0.1] })
    shafts.push(beam)
  }
  return [part('window', frame), part('window-light', [pane], 'glow'), part('shaft', shafts, 'light')]
}

// ============================================================ planken en potjes

export function buildShelves(): Part[] {
  const pieces: BufferGeometry[] = []
  SHELVES.heights.forEach((y, shelf) => {
    const mid = (SHELVES.x0 + SHELVES.x1) / 2
    const width = SHELVES.x1 - SHELVES.x0
    const slope = Math.atan(tilt(shelf, mid + 1) - tilt(shelf, mid))
    pieces.push(roughen(box(width, SHELVES.thickness, SHELVES.depth, C.wood, { at: [mid, y, SHELVES.z], rot: [0, 0, slope] }), 0.006, shelf))
    // Twee hoekijzers onder elke plank
    for (const x of [SHELVES.x0 + 0.35, SHELVES.x1 - 0.35]) {
      pieces.push(
        extrude(
          [
            [0, 0],
            [0.24, 0],
            [0, -0.24],
          ],
          0.035,
          C.woodDark,
          { at: [x, y + tilt(shelf, x), ROOM.back + 0.01], rot: [0, -Math.PI / 2, 0] },
        ),
      )
    }
  })
  return [part('shelves', pieces)]
}

/** De pigmenten in een potje, van onder naar boven, of wat een bijzonder potje erin heeft */
function powderOf(ingredient: Ingredient): { hex: string; share: number }[] {
  if (ingredient.effect === 'contrast')
    return [
      { hex: C.ink, share: 0.5 },
      { hex: C.parchment, share: 0.5 },
    ]
  if (ingredient.effect === 'water') return [{ hex: C.mist, share: 1 }]
  if (ingredient.effect === 'houtskool') return [{ hex: '#26211d', share: 1 }]
  return jarLayers(ingredient)
}

/** Elk potje is twee stukken: het glas (`glass-<id>`) en wat erin en erop zit (`jar-<id>`) */
export function buildJars(ingredients: readonly Ingredient[]): Part[] {
  const forms = new Map(ingredients.map((i) => [i.id, jarForm(i.jar.shape, i.jar.height)]))
  const slots = jarSlots(
    ingredients.filter((i) => !isSpecial(i)).map((i) => ({ id: i.id, widest: forms.get(i.id)!.widest })),
    ingredients.filter(isSpecial).map((i) => ({ id: i.id, widest: forms.get(i.id)!.widest })),
  )
  const parts: Part[] = []
  for (const ingredient of ingredients) {
    const form = forms.get(ingredient.id)!
    const slot = slots.get(ingredient.id)
    if (!slot) continue
    const place = { at: slot.at, rot: [0, slot.turn, 0] as Vec3 }

    // Het poeder: hetzelfde profiel als het glas, iets smaller, tot de vulhoogte, in lagen
    const layers = powderOf(ingredient)
    const bottom = 0.008
    const span = form.fill - bottom
    const stops: { to: number; colour: string }[] = []
    let y = bottom
    for (const layer of layers) {
      y += span * layer.share
      stops.push({ to: y, colour: layer.hex })
    }
    const ys = new Set<number>([bottom, form.fill])
    for (const s of stops.slice(0, -1)) {
      ys.add(s.to - 0.0015)
      ys.add(s.to + 0.0015)
    }
    for (const [, oy] of form.outline) if (oy > bottom && oy < form.fill) ys.add(oy)
    const sorted = [...ys].sort((a, b) => a - b)
    const profile: [number, number][] = [[0, bottom], ...sorted.map((py): [number, number] => [radiusAt(form, py) * 0.84, py]), [0, form.fill]]
    const powder = bands(lathe(profile, '#ffffff', undefined, 14), stops)
    put(powder, place)

    const cork = cyl(form.mouth * 1.08, form.mouth * 0.92, 0.055, ingredient.jar.cork, { at: [0, form.height - 0.02, 0] }, 10)
    put(cork, place)
    const label = labelOf(form)
    const paper = box(label.width, 0.075, 0.006, C.paper, { at: [0, label.y - 0.0375, label.out] })
    put(paper, place)
    const pieces = [powder, cork, paper]
    if (ingredient.effect === 'houtskool') pieces.push(put(blob(0.035, '#4a3f36', { at: [0.02, form.fill + 0.01, 0] }, 0.4, 2, 1), place))

    const glass = lathe(form.outline, '#ffffff', place, 16)
    parts.push(part(`jar-${ingredient.id}`, pieces, 'paint', slot.at), part(`glass-${ingredient.id}`, [glass], 'glass', slot.at))
  }
  return parts
}

// ============================================================ de ketel en het vuur

export function buildCauldron(): Part[] {
  const [cx, , cz] = CAULDRON.at
  const r = CAULDRON.radius
  const b = CAULDRON.lift
  const top = b + CAULDRON.height
  const body = lathe(
    [
      [0, b],
      [r * 0.45, b + 0.02],
      [r * 0.78, b + 0.11],
      [r * 0.96, b + 0.28],
      [r, b + 0.45],
      [r * 0.95, top - 0.06],
      [r * 0.9, top - 0.01],
      [r * 1.04, top + 0.01],
      [r * 1.06, top + 0.05],
      [r * 0.92, top + 0.05],
      [r * 0.88, top - 0.2],
    ],
    [C.iron, C.ironLight],
    { at: [cx, 0, cz] },
    28,
  )
  const pieces = [body]
  // Drie poten, en twee oren met een ring
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.4
    pieces.push(limb([cx + Math.cos(a) * r * 0.6, b + 0.1, cz + Math.sin(a) * r * 0.6], [cx + Math.cos(a) * r * 0.85, 0, cz + Math.sin(a) * r * 0.85], 0.045, 0.035, C.iron, 6))
  }
  for (const side of [-1, 1]) {
    pieces.push(ring(0.09, 0.016, C.ironLight, { at: [cx + side * (r + 0.07), top - 0.06, cz], rot: [0, Math.PI / 2, 0] }, 12, 5))
  }
  // Het oppervlak van wat erin zit: een platte schijf. De app geeft het de draaikolk
  const liquid = lathe(
    [
      [0, LIQUID_Y],
      [r * 0.91, LIQUID_Y],
    ],
    '#ffffff',
    { at: [cx, 0, cz] },
    40,
  )
  return [part('cauldron', pieces), part('cauldron-liquid', [liquid], 'liquid', [cx, LIQUID_Y, cz])]
}

export function buildFire(): Part[] {
  const [cx, , cz] = CAULDRON.at
  const pieces: BufferGeometry[] = []
  const random = seeded(7)
  // Een kring van stenen
  for (let k = 0; k < 11; k++) {
    const a = (k / 11) * Math.PI * 2
    pieces.push(blob(0.1 + random() * 0.04, C.stone, { at: [cx + Math.cos(a) * 0.82, 0.05, cz + Math.sin(a) * 0.82], scale: [1.2, 0.7, 1] }, 0.3, k, 1))
  }
  // Blokken hout, over elkaar
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI + 0.3
    pieces.push(limb([cx - Math.cos(a) * 0.5, 0.06, cz - Math.sin(a) * 0.5], [cx + Math.cos(a) * 0.5, 0.14, cz + Math.sin(a) * 0.5], 0.06, 0.05, k % 2 ? C.wood : C.woodDark, 7))
  }
  // Vlammen, hun eigen licht
  const flames: BufferGeometry[] = []
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2
    const d = k % 2 ? 0.18 : 0.08
    flames.push(cone(0.09 + random() * 0.04, 0.22 + random() * 0.14, [C.terracotta, '#ffd27a'], { at: [cx + Math.cos(a) * d, 0.1, cz + Math.sin(a) * d] }, 6))
  }
  return [part('fire', pieces), part('flames', flames, 'glow', [cx, 0.1, cz])]
}

/** De pollepel staat schuin in de ketel. Hij draait om het midden als er geroerd wordt */
export function buildLadle(): Part[] {
  const [cx, , cz] = CAULDRON.at
  const handleTop: Vec3 = [cx + 0.55, LIQUID_Y + 0.75, cz + 0.32]
  const inLiquid: Vec3 = [cx + 0.22, LIQUID_Y - 0.12, cz + 0.08]
  const bowl = lathe(
    [
      [0, 0],
      [0.06, 0.01],
      [0.085, 0.04],
      [0.09, 0.06],
    ],
    C.wood,
    { at: inLiquid },
    12,
  )
  return [part('ladle', [limb(inLiquid, handleTop, 0.022, 0.03, C.wood, 7), bowl], 'paint', LADLE_PIVOT)]
}

// ============================================================ de werkbank en de rommel

export function buildBench(): Part[] {
  const { x0, x1, z0, z1, top } = BENCH
  const pieces: BufferGeometry[] = []
  pieces.push(roughen(slab(x0, x1, top - 0.07, top, z0, z1, C.wood), 0.008, 2))
  for (const x of [x0 + 0.08, x1 - 0.08]) for (const z of [z0 + 0.08, z1 - 0.08]) pieces.push(slab(x - 0.05, x + 0.05, 0, top - 0.07, z - 0.05, z + 0.05, C.woodDark))
  pieces.push(slab(x0 + 0.1, x1 - 0.1, 0.22, 0.26, z0 + 0.1, z1 - 0.1, C.woodDark))
  // Een stapel boeken, en eentje plat ernaast
  const books: [number, string][] = [
    [0.07, C.moss],
    [0.05, C.rust],
    [0.06, C.ink],
    [0.045, C.mist],
  ]
  let y = top
  books.forEach(([h, colour], i) => {
    pieces.push(box(0.36 - i * 0.03, h, 0.26 - i * 0.015, colour, { at: [x1 - 0.42, y, z0 + 0.26], rot: [0, 0.2 - i * 0.17, 0] }))
    pieces.push(box(0.34 - i * 0.03, h * 0.7, 0.24 - i * 0.015, C.paper, { at: [x1 - 0.41, y + h * 0.15, z0 + 0.265], rot: [0, 0.2 - i * 0.17, 0] }))
    y += h
  })
  pieces.push(box(0.3, 0.05, 0.22, C.terracotta, { at: [x0 + 0.55, top, z0 + 0.2], rot: [0, -0.4, 0] }))
  // Losse papiertjes
  pieces.push(box(0.24, 0.004, 0.17, C.parchment, { at: [x0 + 1.25, top, z1 - 0.2], rot: [0, 0.5, 0] }))
  pieces.push(box(0.2, 0.004, 0.15, C.paper, { at: [x0 + 1.4, top + 0.004, z1 - 0.32], rot: [0, -0.3, 0] }))
  // De vijzel met zijn stamper
  const mx = x1 - 0.75
  const mz = z1 - 0.28
  pieces.push(
    lathe(
      [
        [0, 0],
        [0.09, 0],
        [0.11, 0.04],
        [0.12, 0.12],
        [0.1, 0.12],
        [0.08, 0.05],
        [0, 0.04],
      ],
      C.stone,
      { at: [mx, top, mz] },
      16,
    ),
  )
  pieces.push(limb([mx - 0.02, top + 0.06, mz], [mx + 0.1, top + 0.26, mz - 0.05], 0.03, 0.02, C.parchment, 8))
  return [part('bench', pieces)]
}

export function buildCandles(): Part[] {
  const spots: [Vec3, number][] = [
    [[BENCH.x1 - 0.2, BENCH.top, BENCH.z0 + 0.62], 0.22],
    [[BENCH.x1 - 0.32, BENCH.top, BENCH.z0 + 0.72], 0.14],
    [[SHELVES.x1 - 0.12, SHELVES.heights[2] + SHELVES.thickness + tilt(2, SHELVES.x1 - 0.12), SHELVES.z + 0.05], 0.18],
    [[ROOM.left + 0.45, 0, -2.6], 0.32],
  ]
  const wax: BufferGeometry[] = []
  const flames: BufferGeometry[] = []
  for (const [at, h] of spots) {
    wax.push(cyl(0.032, 0.036, h, C.wax, { at }, 8))
    // Een druppel was langs de kant
    wax.push(blob(0.016, C.wax, { at: [at[0] + 0.03, at[1] + h * 0.7, at[2] + 0.01], scale: [0.7, 1.6, 0.7] }, 0.2, 1, 1))
    wax.push(cyl(0.07, 0.07, 0.015, C.iron, { at }, 10))
    flames.push(blob(0.022, ['#e3b659', '#fff3c4'], { at: [at[0], at[1] + h + 0.035, at[2]], scale: [0.8, 1.7, 0.8] }, 0.1, 3, 1))
  }
  return [part('candles', wax), part('candle-flames', flames, 'glow')]
}

/** Een uil, want die mag */
export function buildOwl(): Part[] {
  const at: Vec3 = [BENCH.x1 - 0.22, BENCH.top, BENCH.z0 + 0.2]
  const [x, y, z] = at
  const pieces: BufferGeometry[] = [
    blob(0.12, C.owl, { at: [x, y + 0.13, z], scale: [0.9, 1.15, 0.85] }, 0.12, 5),
    blob(0.075, C.paper, { at: [x, y + 0.11, z + 0.05], scale: [0.85, 1.1, 0.6] }, 0.1, 6, 1),
    blob(0.1, C.owl, { at: [x, y + 0.3, z], scale: [1.05, 0.9, 0.9] }, 0.1, 7),
    cone(0.03, 0.07, C.owl, { at: [x - 0.06, y + 0.36, z], rot: [0, 0, 0.3] }, 5),
    cone(0.03, 0.07, C.owl, { at: [x + 0.06, y + 0.36, z], rot: [0, 0, -0.3] }, 5),
    cone(0.016, 0.035, C.terracotta, { at: [x, y + 0.29, z + 0.09], rot: [Math.PI / 2 + 0.4, 0, 0] }, 5),
  ]
  for (const side of [-1, 1]) {
    pieces.push(blob(0.032, C.parchment, { at: [x + side * 0.042, y + 0.315, z + 0.075], scale: [1, 1, 0.5] }, 0.05, side + 9, 1))
    pieces.push(blob(0.015, C.ink, { at: [x + side * 0.04, y + 0.315, z + 0.09] }, 0.05, side + 11, 1))
  }
  return [part('owl', pieces)]
}

/** Bosjes kruiden die aan de balk hangen te drogen, en een zak op de vloer */
export function buildHerbs(): Part[] {
  const pieces: BufferGeometry[] = []
  const random = seeded(23)
  const beamY = ROOM.height - 0.26
  for (let k = 0; k < 6; k++) {
    const x = ROOM.left + 0.7 + k * 0.55 + random() * 0.15
    const z = -2.4 + (random() - 0.5) * 0.1
    const drop = 0.35 + random() * 0.3
    pieces.push(limb([x, beamY, z], [x, beamY - drop, z], 0.006, 0.006, C.paper, 4))
    const colour = [C.moss, '#6f7d4a', '#8a7a4a', C.mist][k % 4]
    pieces.push(blob(0.09, colour, { at: [x, beamY - drop - 0.12, z], scale: [0.7, 1.5, 0.7] }, 0.45, k, 1))
  }
  // Een jutezak met iets erin, tegen de muur
  pieces.push(blob(0.32, '#a88a62', { at: [-1.0, 0.28, -2.75], scale: [1, 0.95, 0.8] }, 0.25, 31))
  pieces.push(cyl(0.12, 0.2, 0.18, '#a88a62', { at: [-1.0, 0.52, -2.75] }, 8))
  return [part('herbs', pieces)]
}

// ============================================================ het flesje

/** Het lege flesje op de werkbank. Het palet komt erin als gelaagde vloeistof (`flask-liquid`) */
export function buildFlask(): Part[] {
  const outline = flaskOutline()
  const glass = lathe(outline, '#ffffff', { at: FLASK.at }, 20)
  const mouth = outline[outline.length - 1][0]
  const cork = cyl(mouth * 1.05, mouth * 0.85, 0.06, C.cork, { at: [FLASK.at[0], FLASK.at[1] + FLASK.height - 0.025, FLASK.at[2]] }, 10)
  // Binnenin, smaller dan het glas, van de bodem tot de schouder. Wit: de app kleurt het in lagen
  const inner: [number, number][] = [[0, FLASK_LIQUID.bottom]]
  for (const [r, y] of outline) if (y > FLASK_LIQUID.bottom && y < FLASK_LIQUID.top) inner.push([r * 0.9, y])
  inner.push([FLASK.radius * 0.88, FLASK_LIQUID.top], [0, FLASK_LIQUID.top])
  const liquid = lathe(inner, '#ffffff', { at: FLASK.at }, 20)
  return [part('flask', [glass], 'glass', FLASK.at), part('flask-cork', [cork], 'paint', FLASK.at), part('flask-liquid', [liquid], 'liquid', FLASK.at)]
}

/** Alles samen, in de volgorde waarin het gebakken wordt */
export function buildWorkshop(ingredients: readonly Ingredient[]): Part[] {
  return [...buildRoom(), ...buildWindow(), ...buildShelves(), ...buildJars(ingredients), ...buildCauldron(), ...buildFire(), ...buildLadle(), ...buildBench(), ...buildCandles(), ...buildOwl(), ...buildHerbs(), ...buildFlask()]
}
