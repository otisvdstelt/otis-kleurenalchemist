// spectral.js levert geen eigen types. Alleen wat de kleurkern gebruikt

declare module 'spectral.js' {
  export class Color {
    constructor(value: string | number[])
    /** sRGB-kanalen van 0 tot 255 */
    readonly sRGB: number[]
    readonly OKLab: number[]
    readonly OKLCh: number[]
    readonly luminance: number
    tintingStrength: number
    inGamut(options?: { epsilon?: number }): boolean
    toString(options?: { format?: 'hex' | 'rgb'; method?: 'map' | 'clip' }): string
  }
  /** Meng kleuren zoals verf mengt (Kubelka-Munk), elk met een factor */
  export function mix(...colors: [Color, number][]): Color
}
