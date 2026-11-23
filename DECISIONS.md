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
