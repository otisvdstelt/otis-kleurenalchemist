# Kleurenalchemist

Een werkplaats waar je kleurpaletten brouwt voor echte projecten. De potjes zijn de keuzes die je bij een palet maakt. Je vult de lege kolf met je eigen kleur, kiest een blik met het doel (een website, een app in het donker, een affiche, een huisstijl of een presentatie), en gooit er een paar smaken in, zoals mos, zeeschuim of neon. Die maken het warmer, koeler, lichter of feller. Een zakje kruiden zet de kleurtheorie erin: complementair, analoog of drieklank. Dan roer je, en er komt een flesje uit.

In dat flesje zit een bruikbaar palet:
- reeksen van 50 tot 950 voor neutraal, de hoofdkleur en het accent;
- rollen zoals achtergrond, tekst, hoofdkleur en goed, let op en fout;
- een proefvel dat laat zien hoe het eruitziet voor jouw doel.

Tekst is altijd leesbaar, en dat wordt echt gemeten. Je neemt het mee als Tailwind-thema, CSS, Figma-variabelen, .ase of een link. Weet je niet waar je moet beginnen? Het receptenboek ligt open op een kistje naast de ketel.

Het hoort bij mijn portfolio, [otisstelt.vercel.app](https://otisstelt.vercel.app). Het is dezelfde hand, maar een andere plek.

## Hoe ik het gemaakt heb

- De pagina is React 19 en TypeScript, gebouwd met Vite.
- Het uiterlijk is Tailwind CSS v4. Het gescheurde papier, de bibberende pennenlijnen en de rafelranden zijn CSS en SVG-filters, zonder plaatjes.
- De werkplaats is Three.js met React Three Fiber en drei. Er is niets met de hand gemodelleerd. Elke plank, elk potje en de ketel staan als code in `src/lib/world`, en `npm run world` bakt ze tot één `.glb` met Draco, van ongeveer 156 KB. De potjes, het flesje en de ketel zijn gedraaid op een draaibank (`LatheGeometry`).
- Het schilderij eroverheen is dezelfde postprocessing-pass als in mijn portfolio. Hij zet inktlijnen, geeft het papier tand en laat de mist overrollen als je naar de plank gaat.
- De draaikolk in de ketel en de lagen in het flesje zijn eigen shaders.
- Alle kleurlogica staat in `src/lib/alchemy`, als pure TypeScript zonder React of three, en alles is getest met Vitest:
  - doelen, smaken en harmonieën, en reeksen van 50 tot 950 in OKLCH;
  - grafiekkleuren die je ook bij kleurenblindheid uit elkaar houdt;
  - mengen in OKLab/OKLCH (de damp en de draaikolk mengen spectraal)
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
