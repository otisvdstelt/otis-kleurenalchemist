# Kleurenalchemist

Een werkplaats waar je kleurpaletten brouwt. Je pakt een paar potjes van de plank, zoals zonsondergang, mos, oud papier of neon, en gooit ze in de ketel. Dan roer je met de pollepel. De damp verkleurt, en er komt een flesje uit met jouw palet en een etiket dat met de hand geschreven is.

Het is een spel, maar er zit een echt gereedschap onder. De kleuren mengen zoals verf: blauw met geel geeft groen, en niet grijs. Gooi je er te veel in, dan kookt de ketel over en krijg je modder. Die mag je gewoon bottelen. Een snuifje contrast maakt het palet leesbaar, en dat wordt ook echt gemeten. Een foto kun je erin gooien als ingrediënt. En een flesje deel je met een link, die er bij een ander precies zo uitziet als bij jou.

Het hoort bij mijn portfolio, [otisstelt.vercel.app](https://otisstelt.vercel.app). Het is dezelfde hand, maar een andere plek.

## Hoe ik het gemaakt heb

- De pagina is React 19 en TypeScript, gebouwd met Vite.
- Het uiterlijk is Tailwind CSS v4. Het gescheurde papier, de bibberende pennenlijnen en de rafelranden zijn CSS en SVG-filters, zonder plaatjes.
- De werkplaats is Three.js met React Three Fiber en drei. Er is niets met de hand gemodelleerd. Elke plank, elk potje en de ketel staan als code in `src/lib/world`, en `npm run world` bakt ze tot één `.glb` met Draco, van ongeveer 135 KB. De potjes, het flesje en de ketel zijn gedraaid op een draaibank (`LatheGeometry`).
- Het schilderij eroverheen is dezelfde postprocessing-pass als in mijn portfolio. Hij zet inktlijnen, geeft het papier tand en laat de mist overrollen als je naar de plank gaat.
- De draaikolk in de ketel en de lagen in het flesje zijn eigen shaders.
- Alle kleurlogica staat in `src/lib/alchemy`, als pure TypeScript zonder React of three, en alles is getest met Vitest:
  - mengen in OKLab/OKLCH
  - spectrale menging met [spectral.js](https://github.com/rvanwijnen/spectral.js)
  - gamut mapping zoals in CSS Color 4, met [culori](https://culorijs.org)
  - contrast volgens WCAG 2.2, met APCA ernaast
  - kleurenblindheid volgens Machado (2009)
  - k-means++ op foto's, in een Web Worker
  - de code voor de deellinks
- De potjes komen uit `public/data/ingredients.json` en worden opgehaald met TanStack Query.
- De handschriften zijn vier Google Fonts, via Fontsource.
- Het geluid is gemaakt met Web Audio, zonder één audiobestand.
- Linten gaat met oxlint, de hosting is Vercel.

Waarom ik wat gekozen heb, staat in [DECISIONS.md](DECISIONS.md). Mijn ontwerpregels staan in [PRODUCT.md](PRODUCT.md).

## Draaien

Je hebt Node 22.18 of nieuwer nodig.

```bash
npm install
npm run dev      # starten
npm test         # de kleurkern testen
npm run build    # typechecken, dan bouwen
npm run preview  # de build bekijken
npm run lint
npm run world    # de werkplaats opnieuw bakken na een wijziging in src/lib/world of de potjes
npm run draco    # de Draco-decoder naar public/draco kopiëren
```

Met `?papier` in het adres krijg je de papieren versie zonder 3D. Met `?tijd=dag` of `?tijd=nacht` zet je het uur vast.

## Kleine lettertjes

De code is van mij, en er zit nog geen licentie op. Vraag het me dus even voordat je er een stuk van gebruikt. De lettertypes komen van Google Fonts via Fontsource en houden hun eigen licenties. spectral.js en culori vallen onder de MIT-licentie.

Er is geen backend, geen analytics en er zijn geen cookies. Je plank wordt alleen in je eigen browser bewaard, en de keuze voor dag of nacht ook. Je foto verlaat je apparaat nooit: de kleuren worden eruit gehaald op je eigen telefoon of computer. Een deellink bevat alleen de kleuren, de naam en het recept, en geen foto.
