# Fitnessmakker

En stilren træningsapp til at planlægge programmer, logge træning og følge din udvikling – med flere profiler og illustrationer til hver øvelse.

## Funktioner

- **Flere profiler** – hver person har sine egne programmer, træninger, kropsmål og egne øvelser.
- **Øvelsesbibliotek** – 81 øvelser med animerede illustrationer, muskelkort (forfra/bagfra med primære og sekundære muskler), beskrivelse og teknikpunkter. Filtrér efter muskelgruppe og udstyr, søg på øvelse eller muskel, og opret dine egne øvelser.
- **Programmer** – byg programmer fra bunden eller start fra en skabelon (fuld krop, over/under, push/pull/ben, hjemmetræning). Sæt, reps, vægt og pause pr. øvelse.
- **Ændringshistorik** – hver gang du gemmer et program, logges hvad der er ændret (tilføjet/fjernet øvelser, sæt × reps, vægt).
- **Træningslog** – start en træning fra en programdag eller fri træning. Tidligere sæt vises som reference, pausetimer starter automatisk, og nye rekorder markeres.
- **Fremskridt** – kropsvægt og mål (fedt %, talje, bryst, arm, lår) med grafer, samt estimeret 1RM pr. øvelse.
- **Oversigt** – næste træning i det aktive program, ugens træninger, stime, volumen og seneste rekorder.
- **Data** – alt gemmes lokalt i browseren. Eksport/import som JSON til backup eller flytning mellem enheder.
- Lyst og mørkt tema (følger systemet) og mobilvenligt layout – kan tilføjes til hjemmeskærmen.

## Kom i gang

```bash
npm install
npm run dev      # udviklingsserver på http://localhost:5173
npm run build    # typecheck + produktionsbuild i dist/
```

## Teknik

React 19 + TypeScript + Vite, ingen backend. Illustrationerne tegnes af en lille parametrisk figur-motor (`src/illustrations/`), hvor hver øvelse beskrives med to positurer (vinkler / invers kinematik), som animeres med SVG.

### Tilføj eller ret en øvelse

Øvelserne ligger i `src/data/library/` – én fil pr. muskelgruppe. Hver øvelse har to positurer (`poses`), udstyr (`props`) og muskler (`muscles`), som styrer muskelkortet.

Under udvikling viser `http://localhost:5173/gallery.html` alle øvelser med begge positurer side om side. Filtrér med `?squat,bench-press` og vælg antal kolonner med `#cols=2`.
