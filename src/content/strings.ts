// Alle woorden van de werkplaats op één plek, zodat er later Engels naast kan

export const strings = {
  titel: 'Kleurenalchemist',
  ondertitel: 'Gooi een paar potjes in de ketel, roer, en kijk wat eruit komt.',
  maker: 'Otis van der Stelt',
  laden: {
    bezig: 'De ketel wordt opgestookt',
    klaar: 'De ketel staat klaar',
  },
  /** Woorden voor de naam op het etiket */
  namen: {
    mud: 'Modder, maar wel van jou',
    photo: 'kiekje',
    joiners: ['met', 'met een vleugje', 'en een beetje', 'over'],
    tails: {
      donker: ['bij nacht', 'na middernacht', 'in de kelder', 'onder de trap', 'zonder maan'],
      licht: ['na regen', 'in de ochtend', 'op zondag', 'aan het raam', 'in mei'],
      warm: ['in de zon', 'bij het vuur', 'in augustus', 'van de markt', 'op het terras'],
      koel: ['aan zee', 'in de mist', 'na de storm', 'op het ijs', 'in februari'],
      dof: ['van vroeger', 'op zolder', 'uit een oud boek', 'van opa', 'in de la'],
      fel: ['op de kermis', 'om drie uur', 'met de radio aan', 'in de disco', 'zonder pauze'],
      glad: ['goed geroerd', 'zonder klontjes', 'als zijde', 'op zijn kalmst'],
      streperig: ['half geroerd', 'met strepen', 'nog wild', 'in vlagen'],
    },
  },
} as const

export type Strings = typeof strings
