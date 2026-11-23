# Beslissingen

Wat ik zelf gekozen heb, met de reden erbij. Nieuwste onderaan.

## Fase 1: fundament

- **Versies vastgepind** op de laatste stabiele uitgave van november 2026 (React 19.3, Vite 8.3, Tailwind 4.3, TypeScript 7.0, Vitest 5.1, oxlint 1.94). Exacte versies, geen `^`, zodat een build over een half jaar nog hetzelfde doet.
- **TypeScript 7** (de native compiler) in plaats van 6 zoals in het portfolio. Het is de laatste stabiele versie en `tsc -b` werkt er gewoon mee.
- **`@types/node` op 24**, de lijn van de Node die hier draait, in plaats van de nieuwste 26.
- **Vitest staat in `vite.config.ts`**, met een node-omgeving. De kleurkern is pure TypeScript en heeft geen DOM nodig, dus ook geen jsdom.
- **Dag en nacht volgen de klok** (nacht van 20:00 tot 7:00). Kies je zelf, dan onthoudt dit apparaat dat in `localStorage`. Met `?tijd=dag` of `?tijd=nacht` in het adres kun je het forceren, handig om te testen.
- **Het kolfje** vervangt het plantje uit het portfolio. Het werkt op dezelfde manier: een Suspense-fallback houdt het vast via `lib/progress.ts`, en het luistert ook naar TanStack Query. De vloeistof stijgt terwijl het wacht, er gaan belletjes omhoog en er komt damp uit de hals.
- **Hout als zesde tint** (`--color-wood`) voor planken en de werkbank in de papieren versie. Het is gemengd uit inkt en terracotta, dus het is geen nieuwe kleur maar een tussentint.
- **Vercel herschrijft `/fles/*` en `/plank/*`** naar `index.html`, zodat gedeelde links direct in de SPA landen.
- **De vitest-plugin van oxlint** staat aan, zodat tests dezelfde lintregels krijgen.

## Fase 2: kleurkern

- **culori** (via `culori/fn`, zodat alleen sRGB, lineair sRGB, OKLab en OKLCH meekomen) voor de kleurruimtes en de gamut mapping. Zijn `toGamut('rgb', 'oklch')` is precies het algoritme uit CSS Color 4: lichtheid en tint vast, chroma omlaag met een binary search, en een kleine clip binnen een JND van 0,02. Dat schrijf ik niet zelf opnieuw.
- **spectral.js** voor het mengen als twee pigmenten echt door elkaar gaan (Kubelka-Munk). Het levert geen types, dus die staan in `src/types/spectral.d.ts`. spectral.js neemt sRGB aan, dus een pigment gaat eerst door de gamut mapping naar hex. Daardoor geeft een recept uit een link precies dezelfde uitkomst.
- **Homogeniteit** is `1 - e^(-slagen/10)`: na tien slagen ongeveer tweederde, na dertig bijna glad. Gooi je er iets nieuws in, dan gaat de teller terug naar nul, want dat is nog niet doorgeroerd.
- **Elke plek in het palet is een streep.** Per plek wordt een hoofdpigment getrokken (gewogen, zonder terugleggen), plus een beetje van een tweede. Hoe beter geroerd, hoe meer elke plek naar het gemengde geheel schuift. Felle pigmenten hebben meer kans om hoofdpigment te worden, anders verdwijnt neon tussen de rest.
- **De volgorde van de potjes maakt niet uit.** Seed en pigmenten worden op id gesorteerd. Mos dan neon is hetzelfde als neon dan mos.
- **Licht of donker palet.** Normaal is de achtergrond de lichtste kleur en de tekst de donkerste. Is de menging donker, of zit er genoeg houtskool in, dan draait het om. Zo heeft houtskool echt iets te betekenen.
- **Rollen per grootte**, altijd in dezelfde volgorde: 3 = achtergrond, tekst, accent. 4 = met oppervlak. 5 = met signaal. 6 en 7 = extra accenten. Een kurk zit vast aan een plek, en dus aan een rol.
- **Water en houtskool** werken op de strepen voordat de lichtheden verdeeld worden. Ze schuiven ook het middengebied van de accenten op. Zo wordt het palet lichter of dieper, maar blijft tekst op achtergrond leesbaar.
- **Modder.** Speciale ingrediënten tellen niet mee voor het overkoken. Vanaf zes kleuren trekken de tinten naar hun gewogen gemiddelde, zakt de chroma in en schuift alles naar `oklch(0.45 0.05 60)`, harder naarmate er meer in zit (6 = een derde, 8 = helemaal). Modder door menging is geen aparte regel. De spectrale menging maakt het grijsbruin, en het flesje heet pas modder als de menging minder dan 0,045 chroma over heeft, terwijl de pigmenten gemiddeld boven 0,08 zaten, en het goed geroerd is.
- **Het snuifje contrast** probeert per paar eerst de voorgrond te verschuiven: van de partner af, en als dat niet genoeg is er voorbij. Als dat een ander paar zou breken, verschuift het de achtergrond. Valt de tekst tussen achtergrond en oppervlak in, dan zet het die twee eerst aan dezelfde kant. Alleen als beide kleuren van een paar onder een kurk zitten, lukt het niet, en dat zegt het dan ook. De test probeert 300 willekeurige paletten.
- **WCAG-luminantie** met de drempel 0,04045 uit de huidige sRGB-definitie (WCAG 2.2), in plaats van de oude 0,03928. Voor 8-bit kleuren maakt het geen verschil.
- **APCA** is versie 0.0.98G-4g, de versie waar de bekende referentiewaarden bij horen (zwart op wit Lc 106,04).
- **Monocle.** De Machado-matrices (ernst 1,0) gelden op lineair sRGB. Achtergrond en oppervlak horen op elkaar te lijken, dus die combinatie telt niet. Er komt alleen een waarschuwing als twee rollen normaal wel uit elkaar te houden zijn (delta E OK ≥ 0,08) en door de monocle niet meer.
- **Foto.** Het gewicht per pixel is `1 + 8 × chroma` (chroma begrensd op 0,3). Dan telt een felle pixel ongeveer drie keer zo zwaar als een grijze. k-means draait met zeven groepen en houdt de grootste vier die minstens 0,06 van elkaar verschillen.
- **Deellink, versie 1**, binair en daarna base64url: versie, kleuren (3 bytes hex + 1 byte rol), naam (UTF-8), datum (dagen sinds 2020), roerslagen, grootte, seed en ingrediënten. Een foto neemt zijn pigmenten mee als hex plus gewicht op een tiende. Een flesje met vijf kleuren past in ongeveer 90 tekens. Een plank is een lijst van zulke flesjes, met een eigen versienummer. In de test staat een bevroren code van versie 1, die altijd gelezen moet blijven worden.
- **Woorden buiten de kern.** De naamgever (`names.ts`) krijgt zijn woorden mee uit `strings.ts`, zodat er geen tekst in `lib/alchemy` staat en er later Engels naast kan.
- **Tokens heten naar hun rol**, in het Nederlands: `--kleur-tekst` in CSS en `--color-tekst` in Tailwind, dus `bg-achtergrond` en `text-tekst`. Een tweede accent heet `accent-2`.
