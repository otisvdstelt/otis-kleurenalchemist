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

## Fase 3: papieren versie

- **Eén store, zonder library.** `src/lib/store.ts` is een module met `useSyncExternalStore`. Hij houdt de ketel, de kast, de foto's, het laatste flesje en de plank vast. Het brouwsel wordt eruit afgeleid en pas opnieuw berekend als de ketel verandert. Wat er gebeurt, zet de store als zin in `news`, en dat leest de aria-live-regio voor.
- **Het palet zie je eerst in de damp**, live terwijl je brouwt. Het flesje is een momentopname: pas na het bottelen komen het etiket, het proefvel en de contrastcheck. Zo slaat de check altijd op iets dat vastligt, en niet op een palet dat onder je handen verschuift.
- **Kurken horen bij de ketel**, niet bij het flesje. Je zet ze op een flesje, maar ze werken op de volgende keer roeren. Daarom kan het alleen als het flesje even groot is als wat er nu gebrouwen wordt. "Roer opnieuw" is één slag plus meteen bottelen.
- **Roeren in de papieren ketel** gaat ook met de muis of een vinger: elk heel rondje boven de ketel is één slag. Op de ketel zelf staat `touch-action: pinch-zoom`, zodat een vinger kan roeren zonder dat de pagina meeschuift. Om te scrollen raak je ernaast.
- **Het proefvel laat alleen zien wat er gemeten wordt.** De knop is een omlijning in de accentkleur, met de tekstkleur erin, op de achtergrond. Het label heeft een rand en een stip in het signaal. Een gevulde knop zou tekst-op-accent laten zien, en dat paar meet de check niet. Extra accenten staan er als onderstreping bij.
- **"Gooi er een snuifje contrast in"** staat bij een palet dat niet leesbaar is. Het gooit het snuifje in de ketel en bottelt meteen opnieuw, zodat je voor en na direct naast elkaar ziet.
- **De volgorde in de DOM is kast, ketel, toonbank.** Op een breed scherm staan ze in drie kolommen, en de zijkanten blijven staan terwijl je scrollt. Op een telefoon is de kast een strook om doorheen te vegen, met de ketel eronder in het midden. Zo komt de tabvolgorde overal overeen met wat je ziet. De strook met flesjes onderaan komt in fase 6.
- **Inktlijnen volgen het thema.** Het glas van potjes en flesjes is getekend met `currentColor`, zodat het 's nachts als krijt op donker papier staat in plaats van te verdwijnen.

## Fase 4: werkplaats bouwen en bakken

- **De kleurkern importeert met `.ts`.** Daardoor kan Node hem draaien, en haalt het bakscript de pigmentkleuren van de potjes uit `jarLayers` in de kern. Er staat dus geen tweede kleuromrekening in de wereldcode.
- **De modelleerkit** komt uit het portfolio (`tint`, `put`, `box`, `slab`, `extrude`, `cyl`, `blob`, `limb`, `part`). Hij heeft er `lathe` bij voor alles wat rond is (potjes, het flesje, de ketel, de vijzel, de pollepel) en `bands` voor de lagen poeder in de potjes. `join` maakt eerst alles geïndexeerd, zodat extrusies en lathes samen kunnen.
- **Elk potje is twee stukken**, `glass-<id>` en `jar-<id>` (poeder, kurk en etiket), met het draaipunt op de voet. Dan kan een potje in fase 5 opgetild worden. De namen op de etiketten zijn drei `Text` in Yomogi, en niet gebakken, zodat ze scherp blijven.
- **De ketel en het flesje hebben een `liquid`-stuk**, gebakken als witte vorm. In fase 5 krijgen ze hun eigen shader: de draaikolk en de gelaagde vloeistof.
- **`spec.ts` is de afspraak** tussen bakken en app: waar de planken hangen (een beetje scheef), welk potje waar staat, het profiel per vorm, waar het flesje staat en hoe de camera kijkt.
- **De bijzondere potjes staan op de werkbank** en niet op de planken. Dan zie je meteen dat ze iets anders doen.
- **Gebakken: 56 stukken, ongeveer 18.000 driehoeken, 131 KB met Draco.** Het bakscript stopt met een fout als het boven de 400 KB komt.
- **Glas** is `paintedToon` met transparantie, dubbelzijdig, en een rand die licht vangt waar je er schuin door kijkt (fresnel). De opaciteit is laag (0,16), anders wast het glas de pigmenten uit.
- **InkPaper** is uit het portfolio overgenomen. Alleen de afstandsweging is anders: in het portfolio kregen alleen verre dingen een lijn uit de diepte, hier staat alles dichtbij.
- **De kamer neigt naar de damp** via een gedeelde uniform op het geschilderde materiaal (`tintUniform`, gevoed door `air.tint`). Nu staat hij nog op nul, in fase 5 gaat hij aan.
- **`frameloop="demand"`.** Er wordt alleen getekend als de store verandert of als er iets onderweg is (het uur, de onthulling). De DPR is begrensd: 1 tot 1,75, of 1 tot 1,25 op een telefoon of een zuinig apparaat, en daar is de schaduwkaart ook kleiner.
- **Met de werkplaats erbij** liggen de papieren panelen eroverheen. Links staat de kast als lijstje (de potjes zelf staan op de planken), onderaan de ketelbalk en rechts het flesje, dat je weg kunt zetten. Over de 3D-ketel ligt een onzichtbaar vlak dat de camera elke keer opmeet. Daar roer je met de muis, en daar komt het toetsenbord terecht.
- **Zonder WebGL, als het misgaat, of met `?papier`** in het adres krijg je de papieren versie uit fase 3. Een ErrorBoundary om de werkplaats zet hem om.

## Fase 5: leven erin

- **De draaikolk** is een eigen shader op de schijf in de ketel. De pigmenten (de zwaarste twaalf) liggen als strepen over polair gedraaide fbm-ruis, elk zo breed als zijn gewicht. Binnen draait sneller dan buiten. De strepen gaan op in de mengkleur zodra `homogeniteit` stijgt. Alle kleuren komen uit de kern: de shader verdeelt alleen wat hij krijgt.
- **Roeren** geeft per slag een zet aan de draaikolk, en die zet sterft langzaam weg. De pollepel draait alleen mee op die zetten. Een ketel met iets erin draait ook zonder roeren heel langzaam.
- **Overkoken** heeft de sterkte uit de kern meegekregen (`brew.overflow`). In de shader kruipt het modderbruin vanaf de rand naar binnen, met schuim erop. Borrelen gaat harder als het onrustig is.
- **Damp** bestaat uit zeven billboards met fbm-ruis, elk in een kleur van het palet. Ze stijgen op, worden groter en lossen op. De lichtbundels worden erna getekend, zodat het licht door de damp valt.
- **De kamer neigt naar de damp**: `air.tint` krijgt de mengkleur, en elk geschilderd vlak schuift er een vijfde naartoe.
- **Inschenken**: het flesje loopt in 1,2 seconde vol, de lagen lopen in elkaar over en trekken in 1,8 seconde weer uit elkaar. Op een breed scherm wacht het papieren vel zolang, zodat je het ziet gebeuren.
- **De plank** hangt boven de ketel, met plek voor tien flesjes. Ertussen rolt de mist uit het portfolio (InkPaper `uWipe` 1 en 2): 0,85 seconde mist erover, de camera verzet, en 1,1 seconde mist eraf. In het plankbeeld verdwijnen de kast en de ketelbalk.
- **Wakker blijven.** De werkplaats tekent continu zolang er iets in de ketel zit (damp en bellen bewegen) of zolang `motion.wake()` loopt (een potje, inschenken of mist). Is de ketel leeg en beweegt er niets, dan staat hij stil.
- **Minder beweging** draait niets, klotst niets en laat geen mist rollen. De damp hangt stil, en het uitzicht wisselt met een snede. De stappen zelf blijven hetzelfde.

## Fase 6: foto en delen

- **Foto.** Op de hoofdthread verkleint `createImageBitmap` de foto tot 160 pixels aan de langste kant. Het kleine plaatje gaat als transferable naar een Web Worker (`src/workers/photo.worker.ts`), die de pixels leest, k-means draait en een JPEG-duimnagel teruggeeft. Die duimnagel blijft een blob-URL op het apparaat en dient alleen voor het kaartje dat in 3D in de ketel valt.
- **Dezelfde foto geeft dezelfde pigmenten.** De seed komt uit een vingerafdruk van de pixels, en de id van het ingrediënt (`foto-<seed>`) ook. Twee keer dezelfde foto erin is dus twee keer hetzelfde ingrediënt.
- **Binnenhalen** gaat met een knop, met "of maak er een" (`capture`) op een apparaat met een vinger, met slepen naar waar dan ook op de pagina, en met plakken. Zolang de kleuren eruit gehaald worden, borrelt het kolfje. Onder de knop staat dat de foto op het apparaat blijft.
- **Een flesje uit een link of van de plank** heeft geen brouwsel. Daarom staat er bij zo'n flesje geen snuifje en geen kurk, maar "Brouw ermee verder": dat zet het recept terug in de ketel, foto's inbegrepen, met hetzelfde aantal slagen en dezelfde grootte. Wat de kast niet meer kent, valt weg.
- **Links.** `/fles/<code>` en `/plank/<code>` worden één keer gelezen bij het openen. Daarna gaat het adres terug naar `/`, zodat ververs niet steeds opnieuw hetzelfde flesje opent. Een gedeelde plank zet je niet meteen op je eigen plank: je bekijkt hem eerst, en kiest dan "zet ze op mijn plank" (zonder dubbelen) of "alleen bekijken".
- **De plank** staat in `localStorage` als dezelfde code als een gedeelde plank: één formaat voor bewaren en delen. Lukt opslaan niet, dan zegt de pagina dat de plank er zolang staat als de pagina open is.
- **Verplaatsen** gaat aan een greep. Met de muis of een vinger sleep je, en het flesje schuift naar de dichtstbijzijnde plek. Met het toetsenbord: Enter pakt op, de pijltjes schuiven, Enter of Escape zet neer. Elke stap wordt voorgelezen ("staat nu op plek 3 van 7").
- **Exports.** CSS en Tailwind gaan naar het klembord, want die plak je direct in je eigen code. JSON en PNG worden gedownload. De PNG is een canvas van 900 bij 1200 met dezelfde flesvorm (`flesVorm.ts`), dezelfde handschriften en de kleuren met hun rol en hexwaarde.
- **In 3D** staan de flesjes van de plank boven de ketel, met hun lagen en een papiertje met de naam. Erop drukken pakt het flesje van de plank. Op een telefoon is de plank een strook onderaan. In de werkplaats komt hij in beeld als je naar de plank gaat.

## Fase 7: afwerking

- **De monocle** staat bij het flesje: gewoon, deuteranopie, protanopie of tritanopie. Je ziet de kleuren en het proefvel zoals iemand met die vorm van kleurenblindheid ze ziet, en in gewone woorden welke rollen dan samenvallen, met een tip erbij.
- **Geluid** is synthetisch, met Web Audio, en zonder bestanden. Belletjes knappen, vaker naarmate het onrustiger borrelt. Bij een ingrediënt hoor je een plons, bij roeren een zwiep, bij bottelen een klok met een tikje glas, en bij overkoken een sis. Het staat altijd uit als de pagina opent, ook als het de vorige keer aan stond. Zo is er nooit geluid waar niemand om vroeg, en de browser staat het alleen toe na een klik.
- **Prestatiebudget.** drei's `PerformanceMonitor` laat de DPR met stappen van 0,25 zakken (tot 0,75) als het onder de 50 beelden per seconde komt, en laat hem weer stijgen als het goed gaat. Daar bovenop: frameloop demand, een begrensde DPR, een kleinere schaduwkaart op een zuinig apparaat, en three.js in een eigen luie chunk. De eerste chunk is ongeveer 117 KB met gzip, de werkplaats ongeveer 135 KB.
- **De telefoon met de werkplaats** is een kolom: bovenaan de kop met de schakelaars op één regel, dan de kast als strook met de foto en de belofte, in het midden de ketel en onderaan de ketelbalk. Het flesje komt als vel van onderen. De knop naar de plank heet daar kort "plank", met een langere toegankelijke naam.
- **Toegankelijkheid.** axe-core (WCAG 2.2 AA en best practices) geeft nul bevindingen op papier en in de werkplaats, overdag en 's nachts, breed en op een telefoon. De naam van een potje komt uit zijn zichtbare tekst ("Gooi" en "in de ketel" alleen voor schermlezers), en het etiket is de beschrijving. Het canvas is `aria-hidden`, omdat alles wat je ermee kunt ook in de papieren laag staat.
- **Minder beweging** is in de werkplaats nagelopen. Niets draait, niets klotst en de mist rolt niet. Het uitzicht wisselt met een snede, en het vel van het flesje komt meteen.
