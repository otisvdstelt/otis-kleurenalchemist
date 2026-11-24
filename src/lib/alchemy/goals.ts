// Waar het palet voor is. Het doel bepaalt de opbouw: welke rollen, welke reeksen, en hoe licht of donker

import type { GoalId } from './ingredients.ts'
import type { RampName, Role } from './palette.ts'

export interface Goal {
  id: GoalId
  /** Donkere achtergrond met lichte tekst */
  dark: boolean
  /** De rollen, in deze vaste volgorde */
  roles: Role[]
  /** Welke reeksen van 50 tot 950 erbij horen */
  ramps: RampName[]
  /** Hoe licht en hoe fel de hoofdkleur is als je geen basis meegeeft */
  main: { l: number; c: number }
  /** Hoe licht en fel een accent is */
  accent: { l: number; c: number }
  /** Hoeveel accenten er hooguit zijn */
  accents: number
}

const LIGHT_UI: Role[] = ['achtergrond', 'oppervlak', 'rand', 'tekst', 'zachte-tekst', 'hoofd', 'op-hoofd', 'accent', 'goed', 'let-op', 'fout']

export const GOALS: Record<GoalId, Goal> = {
  website: { id: 'website', dark: false, roles: LIGHT_UI, ramps: ['neutraal', 'hoofd', 'accent'], main: { l: 0.55, c: 0.15 }, accent: { l: 0.62, c: 0.14 }, accents: 2 },
  donker: { id: 'donker', dark: true, roles: LIGHT_UI, ramps: ['neutraal', 'hoofd', 'accent'], main: { l: 0.72, c: 0.13 }, accent: { l: 0.74, c: 0.11 }, accents: 2 },
  affiche: { id: 'affiche', dark: false, roles: ['achtergrond', 'tekst', 'hoofd', 'accent'], ramps: [], main: { l: 0.62, c: 0.22 }, accent: { l: 0.72, c: 0.2 }, accents: 1 },
  huisstijl: { id: 'huisstijl', dark: false, roles: ['hoofd', 'accent', 'achtergrond', 'tekst'], ramps: ['neutraal', 'hoofd'], main: { l: 0.5, c: 0.14 }, accent: { l: 0.66, c: 0.13 }, accents: 1 },
  presentatie: {
    id: 'presentatie',
    dark: false,
    roles: ['achtergrond', 'tekst', 'zachte-tekst', 'hoofd', 'grafiek', 'grafiek', 'grafiek', 'grafiek', 'grafiek', 'grafiek'],
    ramps: ['neutraal', 'hoofd'],
    main: { l: 0.55, c: 0.13 },
    accent: { l: 0.6, c: 0.12 },
    accents: 1,
  },
}

export const DEFAULT_GOAL: GoalId = 'website'
