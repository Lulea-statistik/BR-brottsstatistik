# BR-brottsstatistik

Brottsförebyggande rådet (Brå), statistik över anmälda brott.

## Befintlig Luleå/Boden-serie

`scrape_bra.py` hämtar månads-, kvartals- och helårsdata för Luleå och Boden. Resultaten ligger i bland annat `data/history.csv`.

## Årsdata för alla kommuner 1996-

Repo:t innehåller nu även en separat, nationell årsserie från Brå-topic **Årsvis – Kommun och storstädernas stadsområden 1996-**. Endast de 290 kommunerna tas med; storstädernas stadsområden filtreras bort.

Körningen ligger i workflowet **Update BRÅ annual all municipalities** och använder `scrape_bra_all_municipalities.py`.

Data lagras i `data/annual_all/` med **en Parquet-fil per år**, exempelvis `year=2025.parquet`. Detta är avsiktligt: en enda CSV med alla kommuner, alla brottstyper och hela historiken skulle bli för stor för GitHubs filgräns. Parquet ger betydligt mindre filer och fungerar bra att kombinera i Power BI.

Lookup-filer:
- `municipalities.csv` – kommun/Region_ID och Brås regionnamn
- `categories_annual.csv` – brottshierarki och Brott_ID
- `metadata.json` – källa, tillgängliga år och uppdateringstid

Workflow-lägen:
- **bootstrap** – första historikhämtningen från 1996 till senaste årsperiod som finns hos Brå
- **update** – hämtar bara de två senaste tillgängliga årsperioderna
- **refresh** – hämtar om hela historiken
- `target_year` kan användas för att köra om ett enda år

Brå anger att kommunstatistik finns från 1996 och att nuvarande kommunindelning används för alla år. Källa: https://statistik.bra.se/solwebb/action/anmalda/urval/urval?menyid=101


## GitHub Pages-rapport

Repo:t innehåller nu en webbrapport under `docs/` med fyra flikar:
- Översikt
- Trender
- Årskarta
- Metod & data

Rapporten läser de befintliga årsvisa Parquet-filerna direkt i webbläsaren med DuckDB-Wasm. Årskartan använder en förenklad kommungeometri som byggs vid deployment, i första hand från SCB:s öppna geodata.

Workflowet **Build and deploy BRÅ dashboard** bygger webbdata och publicerar GitHub Pages.
