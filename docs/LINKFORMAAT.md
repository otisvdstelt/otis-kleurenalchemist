# Het linkformaat van een flesje

Een flesje uit de Kleurenalchemist reist als link: `/fles/<code>`. Een hele plank reist als `/plank/<code>`. Er is geen server: alles wat nodig is, zit in de code zelf. De Letterzetterij leest dezelfde links. Daar worden `tekst`, `achtergrond` en `accent` inkt, papier en tweede inkt (`inkAndPaper` in `src/lib/alchemy/share.ts`).

De code is base64url zonder opvulling (`A–Z a–z 0–9 - _`). Daaronder zit dit, byte voor byte:

## Flesje, versie 1

| Veld | Vorm |
|---|---|
| versie | 1 byte, nu `1` |
| aantal kleuren | 1 byte, 3 tot 7 (de lezer accepteert 1 tot 12) |
| per kleur | 3 bytes sRGB (r, g, b), dan 1 byte rol: 0 achtergrond, 1 oppervlak, 2 tekst, 3 accent, 4 signaal |
| naam | varint lengte, dan UTF-8, hooguit 80 tekens |
| datum | varint, dagen sinds 1 januari 2020 (UTC) |
| roerslagen | varint |
| grootte | 1 byte |
| seed | 4 bytes, little-endian |
| aantal ingrediënten | 1 byte |
| per ingrediënt | 1 byte soort (0 potje uit de kast, 1 foto), dan varint lengte en de id in UTF-8. Bij een foto daarna 1 byte aantal pigmenten, en per pigment 3 bytes sRGB plus 1 byte gewicht maal tien |

Een varint is zeven bits per byte, de laagste eerst, met de hoogste bit aan zolang er nog een byte volgt.

**De kleuren zelf staan erin.** Het recept gaat mee om verder te brouwen, maar wie de link opent, ziet de hexwaarden uit de link, niet een nieuwe menging. Zo blijft een gedeeld flesje er hetzelfde uitzien, ook als het mengen later verandert.

## Plank, versie 1

| Veld | Vorm |
|---|---|
| versie | 1 byte, nu `1` |
| aantal flesjes | varint, hooguit 200 |
| per flesje | varint lengte, dan de bytes van een flesje zoals hierboven (met zijn eigen versiebyte) |

## Nieuwe versies

Een nieuwe versie krijgt een nieuw versienummer en een eigen lezer. De oude lezers blijven staan. In `share.test.ts` staat een bevroren code van versie 1 die altijd gelezen moet blijven worden. Een lezer die een onbekende versie tegenkomt, geeft `null` terug en struikelt niet.

## Een geplakte link lezen

`codeFromLink` haalt de code uit een hele link (van welke site ook), uit een pad, of neemt de code zelf. Zo kan de Letterzetterij een flesjeslink van hier lezen, en andersom.
