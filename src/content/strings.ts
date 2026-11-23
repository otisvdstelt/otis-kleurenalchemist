// Alle woorden van de werkplaats op één plek, zodat er later Engels naast kan

export const strings = {
  titel: 'Kleurenalchemist',
  ondertitel: 'Gooi een paar potjes in de ketel, roer, en kijk wat eruit komt.',
  maker: 'Otis van der Stelt',
  laden: {
    bezig: 'De ketel wordt opgestookt',
    klaar: 'De ketel staat klaar',
  },
} as const

export type Strings = typeof strings
