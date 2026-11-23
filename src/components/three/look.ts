import bodyFace from '@fontsource/klee-one/files/klee-one-latin-400-normal.woff?url'
import displayFace from '@fontsource/zen-antique-soft/files/zen-antique-soft-latin-400-normal.woff?url'
import handFace from '@fontsource/yomogi/files/yomogi-latin-400-normal.woff?url'
import scriptFace from '@fontsource/homemade-apple/files/homemade-apple-latin-400-normal.woff?url'
import { Color } from 'three'

/** De kleuren van het uur, elk frame gemengd en gelezen door de lucht, het papier en de inkt */
export const look = {
  paper: new Color('#f7f4eb'),
  ink: new Color('#1c1917'),
  /** Het waas in de kamer */
  fog: new Color('#e9dfc9'),
}

/** De vier handschriften, voor alles wat in de werkplaats geschreven staat */
export const FACES = { body: bodyFace, display: displayFace, hand: handFace, script: scriptFace }
export type Face = keyof typeof FACES

/** Inkt op een etiket, op elk uur hetzelfde: het etiket is papier */
export const LABEL_INK = '#2c2823'
