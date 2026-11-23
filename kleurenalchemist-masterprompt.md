# Masterprompt: Kleurenalchemist

> Plak alles hieronder in een nieuwe Claude Code-sessie, in een lege map voor het project.

---

## Rol en opdracht

Je bouwt **Kleurenalchemist**, een webapp waarin je in een rommelige alchemistenwerkplaats kleurpaletten brouwt. Je werkt als senior creative developer: sterk in React, Three.js en shaders, en net zo zorgvuldig met kleurwetenschap en toegankelijkheid. Het project hoort zichtbaar bij mijn portfolio (otisstelt.vercel.app). Het is dezelfde hand, maar een andere plek.

Werk in fases (zie onderaan). Na elke fase moet de app draaien, `npm run build` en `npm run lint` moeten slagen, en geef je een korte samenvatting van wat er staat en wat nog niet. Vraag het me alleen als een keuze echt van mij is. Kies verder zelf, en schrijf de keuze op in `DECISIONS.md`.

## De ervaring

Je staat in een rommelige werkplaats met planken vol potjes: *zonsondergang*, *mos*, *oud papier*, *neon*, *diepzee*, *herfst* en meer. Je gooit er een paar in de ketel en roert met de pollepel. De damp verkleurt. Er komt een flesje uit met je palet, en het etiket is met de hand geschreven.

Vaste regels:
- **Te veel ingrediënten**: de ketel kookt over en je krijgt modder.
- **Een snufje contrast** maakt je palet leesbaar, met een echte toegankelijkheidscheck erachter.
- **Een foto** kun je in de ketel gooien. Hij wordt een ingrediënt waar de kleuren uit gehaald worden.
- **Flesjes** zet je op een plank en deel je via een link.

## Eerst: lees mijn portfolio

Clone https://github.com/otisvdstelt/portfolio-otis-v2 naar een tijdelijke map en lees het voordat je iets bouwt. Lees vooral `PRODUCT.md` en `README.md`: de ontwerpregels en de toon gelden hier ook. Neem deze onderdelen over en pas ze aan. Kopieer ze niet blind, maar neem hun bedoeling mee:

| Uit het portfolio | Waarvoor hier |
|---|---|
| `src/components/three/InkPaper.tsx` | De schilderpass: inktlijnen uit diepte en tint, papiertand, pigment dat in vlekken samenloopt, een rafelige rand en de mistwipe. Gebruik de mist voor overgangen (werkplaats ↔ plank) en de `uReveal`-spreiding voor de eerste keer dat het beeld verschijnt. |
| `src/components/three/materials.ts` | `paintedToon` (cel shading met drie tonen via `toonGradient`, en `washTexture` die over alles ligt), `glow` voor kaarsen en het vuur onder de ketel, en `shaft` voor lichtbundels door de stoom. Maak er een variant van voor glas (potjes en flesjes). |
| `src/lib/world/kit.ts` + `terrain.ts` | De modelleerkit (`tint`, `put`, `box`, `slab`, `extrude`, `fbm`/`valueNoise`). Breid hem uit met `LatheGeometry` voor potjes, flesjes, de ketel en kurken. |
| `scripts/build-world.ts` | Het bakpatroon: alles in code gebouwd, met glTF Transform gebakken naar één Draco-`.glb`, als benoemde meshes met vertexkleuren. De app wisselt materialen op naam. |
| `src/lib/air.ts` | Eén gedeelde state voor alle shaders (`time`, `reveal`, `wipe`, `night`). Gebruik `air.tint` (in het portfolio nog ongebruikt) om de hele kamer naar de kleur van de damp te laten neigen. |
| `src/components/three/look.ts` | Het idee van één `look`-object met de kleuren van het uur, dat lucht, papier en inkt elk frame lezen. |
| `src/components/ui/Chrome.tsx` | De SVG-filters `deckle`, `deckle-fine`, `wobble` en `bleed`. |
| `src/index.css` | De tokens (`--tooth`, `--squiggle`, `--shadow-rest`), de klassen `.paper`, `.slip`, `.plaque` en `.tag`, de vier handschriften en het dag/nacht-thema via `data-theme`. |
| `src/components/ui/Sprout.tsx` | De laadindicator. Hier wordt het een klein **borrelend kolfje** in de hoek in plaats van een plantje. |
| `.oxlintrc.json`, `vercel.json`, `vite.config.ts` | Dezelfde opzet, inclusief three.js als losse lazy chunk. |

Hou de vijf basiskleuren van het portfolio (perkament, inkt, mos, mist, terracotta) aan als de kleuren van de **werkplaats zelf**. De paletten die je brouwt zijn het enige dat daar fel uit springt.

## Stack (vast)

| Onderdeel | Keuze |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| 3D | Three.js + React Three Fiber + drei + postprocessing |
| Modellen | In code gebouwd, gebakken naar `.glb` met glTF Transform (Draco) |
| Data ophalen | TanStack Query |
| Linten | oxlint |
| Hosting | Vercel |

Aanvullingen die ik toesta, elk met een reden in `DECISIONS.md`:
- **culori** voor kleurruimtes (OKLCH/OKLab ↔ sRGB, gamut mapping, delta E).
- **spectral.js** voor kleurmenging zoals verf mengt (Kubelka-Munk): blauw met geel geeft groen en geen grijs.
- **Vitest** voor de kleurkern. Een toegankelijkheidscheck zonder tests is geen check.
- Fonts via Fontsource, net als in het portfolio.

Installeer de laatste stabiele versies en pin ze in `package.json`.

## Architectuur

Splits het project hard in drie lagen:

1. **`src/lib/alchemy/`**: pure TypeScript zonder React of three. Hier zit alle logica: ingrediënten, mengen, modder, contrast, foto-extractie, codering voor de deellink en een seeded PRNG. Alles is deterministisch en getest.
2. **`src/components/ui/`**: de papieren laag in DOM. Hier staan alle knoppen, labels en uitkomsten, en deze laag werkt ook **zonder 3D**.
3. **`src/components/three/`**: de werkplaats. Dat is alleen presentatie. Hij leest de state en stuurt intenties terug (`add`, `stir`, `pour`, `bottle`), maar houdt nooit zelf de waarheid vast.

Eén store (`useSyncExternalStore` of een kleine reducer, zonder zware state-library) is de bron. De 3D-wereld en de DOM-laag zijn twee weergaven van dezelfde ketel.

## De kleurkern in detail

### Ingrediënten
- Ze staan in `public/data/ingredients.json` en worden opgehaald met **TanStack Query**, zoals de projecten in het portfolio.
- Elk ingrediënt heeft: `id`, `naam`, `etiket` (een korte zin in mijn toon), `pigmenten` (2 tot 4 kleuren in **OKLCH**, elk met een gewicht), `potje` (vorm, hoogte, kleur van de kurk) en optioneel `karakter` (warm/koel, dof/fel).
- Begin met ongeveer 16 ingrediënten: zonsondergang, mos, oud papier, neon, diepzee, herfst, roest, lavendel, as, citroen, nachtlucht, klei, zeeschuim, kersenbloesem, inkt en koper.
- **Speciale ingrediënten** voegen geen kleur toe, maar bewerken het palet:
  - **Contrast** (een snuifje): zie hieronder.
  - **Water**: verdunt het palet. Het wordt lichter en minder verzadigd.
  - **Houtskool**: maakt het palet dieper en donkerder.

### Mengen
- Werk in **OKLab/OKLCH**, nooit in RGB.
- Gebruik spectrale menging (spectral.js) als twee pigmenten echt door elkaar gaan.
- **Roeren** telt mee. Weinig roeren laat meer variatie en strepen over. Veel roeren maakt het geheel eenvormiger. Leg dit vast als één getal, `homogeniteit` (0 tot 1).
- Het palet heeft standaard 5 kleuren (instelbaar van 3 tot 7). Zorg altijd voor een bruikbare spreiding in lichtheid: minstens één lichte kleur, één donkere en de rest als accenten. Een palet van vijf middentonen is nutteloos.
- Wijs **rollen** toe: `achtergrond`, `oppervlak`, `tekst`, `accent`, `signaal`. Die rollen sturen de contrastcheck.
- Hetzelfde recept met dezelfde seed geeft precies hetzelfde palet (seeded PRNG, bijvoorbeeld mulberry32, met een seed uit een hash van het recept en het aantal roerslagen).
- Gamut mapping: hou de lichtheid en de tint vast en verlaag de chroma tot de kleur in sRGB past (het algoritme uit CSS Color 4).

### Modder (overkoken)
- 1 tot 4 ingrediënten: normaal.
- 5: de ketel borrelt onrustig. Laat dat zien en horen, het is een waarschuwing.
- 6 of meer: de ketel **kookt over**. De tinten trekken naar hun gewogen gemiddelde, de chroma zakt in en alles schuift richting een modderbruin (ongeveer `oklch(0.45 0.05 60)`).
- Ook zonder te veel ingrediënten kan er modder ontstaan, als je twee complementaire kleuren met hoge chroma mengt. Dat volgt vanzelf uit de spectrale menging en is goed zo.
- Modder is geen foutmelding. Je kunt het nog steeds bottelen, en het flesje krijgt dan een eerlijk etiket ("Modder, maar wel van jou").
- **Afscheppen** (ongedaan maken) haalt het laatste ingrediënt weer uit de ketel.

### Contrast: een echte check
- Bereken de contrastverhouding volgens **WCAG 2.2** (relatieve luminantie) voor alle relevante rolparen: tekst op achtergrond, tekst op oppervlak, accent op achtergrond, en signaal op achtergrond.
- Drempels: 4,5:1 voor gewone tekst, 3:1 voor grote tekst en UI-onderdelen, 7:1 voor AAA.
- Laat **APCA** (Lc-waarde) ernaast zien als extra informatie, duidelijk gemarkeerd als concept-standaard.
- Het **snuifje contrast** verschuift alleen de lichtheid in OKLCH, en zo weinig mogelijk (binary search), tot elk paar zijn drempel haalt. Tint en chroma blijven zoveel mogelijk staan. Laat voor en na naast elkaar zien.
- Laat met een **monocle** of loep zien hoe het palet eruitziet bij kleurenblindheid (deuteranopie, protanopie, tritanopie; matrices van Machado 2009) en waarschuw als twee rollen dan niet meer van elkaar te onderscheiden zijn (delta E OK < 0,08).
- Elke check in de UI zegt in gewone woorden wat er aan de hand is, dus niet alleen "fail" maar ook "deze tekst is slecht te lezen op deze achtergrond".

### Foto in de ketel
- Je kunt een foto slepen, plakken of (op een telefoon) maken met `capture`.
- Verklein hem met `createImageBitmap` tot ongeveer 160px en doe **k-means++ in OKLab** in een **Web Worker**. Weeg pixels met een hoge chroma iets zwaarder, anders wordt elk palet beige.
- De foto wordt een **ingrediënt** met eigen pigmenten. Je kunt hem dus mengen met mos of neon, en hij is geen aparte modus.
- In 3D valt de foto als een papieren kaartje in de ketel en lost daar op.
- De foto **verlaat het apparaat nooit**. Zeg dat ook in de UI.

### Flesjes, plank en delen
- Een flesje bevat: het palet (hexwaarden), de rollen, het recept (ingrediënten, roerslagen en seed), een gegenereerde naam ("Mos na regen") en de datum.
- **Je deelt de uitkomst, niet alleen het recept.** De link bevat de hexwaarden zelf, zodat een gedeeld flesje er hetzelfde uit blijft zien als ik het mengalgoritme later aanpas. Het recept gaat mee om verder te brouwen. Zet een versienummer in het formaat.
- Codering: compact, base64url, in het pad (`/fles/<code>`) of in de hash. Vercel herschrijft het pad naar de SPA. Er is geen backend en er is geen database.
- **De plank** wordt per apparaat bewaard in `localStorage`, met try/catch eromheen, en ook het delen van een hele plank gaat via een link (`/plank/<code>`). Flesjes kun je verplaatsen met de muis én met het toetsenbord.
- **Exporteren** naar CSS custom properties, een Tailwind v4 `@theme`-blok (direct te gebruiken in mijn eigen stack), JSON, en een PNG van het flesje met etiket.
- Klik op een kleur om de hexwaarde te kopiëren, met een kleine handgeschreven bevestiging.
- **Kurk erop**: zet een kleur vast en roer opnieuw. Alleen de rest verandert.

### Palet in gebruik
Laat naast het flesje een klein **proefvel** zien: een papieren kaartje met een kop, een stuk tekst, een knop en een label, in de rollen van het palet. Zo zie je meteen of het werkt, en de contrastcheck slaat precies op wat je daar ziet.

## De werkplaats (3D)

- Alles wordt in code gebouwd en gebakken: houten planken die een beetje scheef hangen, 16 potjes met kurk en een handgeschreven etiket (drei `Text` met de Fontsource-fonts, zoals in het portfolio), de ketel op een vuurtje, de pollepel, een werkbank vol rommel (boeken, een vijzel, kaarsen, een uil mag), en een raam.
- **Potjes**: maak ze met `LatheGeometry`, elk iets anders van vorm, met de pigmenten zichtbaar als lagen of als poeder achter het glas.
- **Ketelvloeistof**: een eigen shader. De kleuren van de ingrediënten zijn strepen die in een draaikolk meedraaien (polaire rotatie van fbm-ruis, aangestuurd door de roersnelheid) en langzaam overgaan in de mengkleur naarmate `homogeniteit` stijgt. Bij overkoken komt er schuim en kruipt er bruin vanaf de rand naar binnen.
- **Damp**: billboards met fbm-ruis, ingekleurd naar het palet. Dat is het moment dat je het palet het eerst ziet. Laat de lichtbundels (`shaft`) door de damp vallen.
- **Het flesje**: het palet staat als **gelaagde vloeistof** in het glas, met één laag per kleur, zoals een cocktail met lagen. Bij het inschenken lopen de lagen in elkaar over en trekken ze daarna weer uit elkaar.
- **Roeren**: sleep rondjes boven de ketel. Hoe sneller je draait, hoe harder de draaikolk gaat. Op het toetsenbord: spatie of de pijltjes roeren, en Enter bottelt.
- **Dag en nacht** volgen de klok, zoals in het portfolio. 's Nachts gloeien de kaarsen en het vuur, en de damp licht een beetje op.
- De postprocessing is de **InkPaper**-pass, zodat het eruitziet als hetzelfde aquarelboek als het portfolio.
- `frameloop="demand"` zolang er niets beweegt. DPR wordt begrensd, net als in het portfolio. Zet er een budget naast voor mobiel.

## Ontwerpregels (zelfde ziel als het portfolio)

- Eén idee, helemaal doorgezet: alles is de werkplaats, glas en papier.
- Laad nooit een lege pagina. Het kolfje borrelt in de hoek.
- **Zonder 3D werkt alles nog**: kiezen, roeren (met een knop), bottelen, contrast, foto, plank en delen. Wat je dan ziet is een papieren versie met potjes als `.slip`-kaartjes en een getekende ketel in SVG.
- Het toetsenbord bereikt alles wat de muis bereikt. De paletuitkomst wordt aangekondigd via een `aria-live`-regio ("Flesje gevuld: Mos na regen, vijf kleuren, alle teksten leesbaar").
- Geen beweging waar niemand om vroeg. Bij `prefers-reduced-motion` blijven de stappen hetzelfde, maar verdwijnen het klotsen, de draaikolk en de mistwipe.
- **Geen geluid waar niemand om vroeg.** Borrelen en klokken (Web Audio, synthetisch, zonder audiobestanden) staat standaard uit en heeft een duidelijke schakelaar.
- Gebouwd voor een telefoon. Daar is de plank een strook onderaan en staat de ketel in het midden.
- De teksten zijn in het Nederlands: kort, warm, een beetje eigenwijs en zonder opvulling. Zet alle teksten in één bestand (`src/content/strings.ts`), zodat er later Engels bij kan.
- Geen analytics, geen cookies en geen backend.

## Kwaliteitseisen

- **Tests (Vitest)** voor de hele `lib/alchemy`: dat het mengen deterministisch is, de modderdrempels, de contrastverhouding vergeleken met bekende WCAG-voorbeelden (zwart op wit = 21:1), dat het snuifje contrast elk paar boven de drempel brengt, dat coderen en decoderen van een link elkaar opheffen en oude versies nog leest, en k-means op een synthetisch plaatje.
- **Prestaties**: de eerste tekst staat er binnen 1,5 s op 4G. Three.js zit in een lazy chunk. De gebakken `.glb` is kleiner dan 400 KB met Draco. Mik op 60 fps op een gewone telefoon, en laat het budget anders automatisch zakken.
- Een **ErrorBoundary** rond de wereld, zoals in het portfolio: bij een fout zie je de papieren versie.
- Lighthouse toegankelijkheid is 100. De app werkt met VoiceOver.

## Fases

Lever per fase. Ga pas door als de vorige draait.

1. **Fundament**: Vite + React 19 + TS + Tailwind v4 + oxlint + Vitest + de Vercel-config. Haal de tokens, fonts, SVG-filters, `.paper`/`.slip`/`.plaque` en de borrelende laadindicator over uit het portfolio. Schrijf `PRODUCT.md` met de ontwerpregels hierboven, in mijn toon.
2. **Kleurkern**: `lib/alchemy` compleet en getest, inclusief `ingredients.json`.
3. **Papieren versie**: de hele ervaring van begin tot eind in DOM en SVG, zonder 3D. Dit is meteen de fallback.
4. **Werkplaats bouwen en bakken**: kit, lathe-onderdelen, `build-world.ts` en de `.glb`. Statisch, met de toon-materialen en de InkPaper-pass.
5. **Leven erin**: de vloeistofshader, damp, roeren, overkoken, het inschenken in het flesje, `air.tint` voor de kamer en de mistwipe naar de plank.
6. **Foto en delen**: de worker voor k-means, de foto als ingrediënt, linkcodering, de plank en de exports.
7. **Afwerking**: contrastmonocle, geluid, dag en nacht, de mobiele layout, reduced motion, prestatiebudget, README in mijn toon.

## Als er tijd over is (niet eerder)

- Een OG-afbeelding voor gedeelde flesjes via een Vercel-functie (`@vercel/og`), zodat een link in een chat een flesje met jouw kleuren laat zien. Dit is de enige serverkant. Overleg eerst.
- **Receptenboek**: ontdekte "geheime" combinaties (diepzee + neon = "bioluminescentie") worden als bladzijde in een boek op de werkbank bewaard.
- **Dagelijks ingrediënt**: één potje dat per dag wisselt, met een seed op basis van de datum.
- Een palet uit het flesje toepassen op de werkplaats zelf, zodat de hele kamer even in jouw kleuren staat.

## Wat je níet doet

- Geen kleurlogica in componenten of shaders. Die staat alleen in `lib/alchemy`.
- Geen RGB-gemiddelden als "menging".
- Geen modellen met de hand maken of downloaden. Ook geen textures van internet.
- Geen nieuwe zware dependencies zonder reden in `DECISIONS.md`.
- De foto nergens heen sturen.
