# zulfi316.github.io

Personal static site hosted on **GitHub Pages** at
**[zulfi316.github.io](https://zulfi316.github.io)**. It contains two
independent, fully client-side pages — no build step, no server, no
dependencies to install.

## 🏔️ Banff Trip Planner (`trips/2026/09/banff.html`)

A mobile-first, day-by-day itinerary for a Canadian Rockies trip
(Sept 26 – Oct 4, 2026). The root `index.html` redirects here, so it's the
site's landing page. Features:

- Day-by-day timeline with drives, hikes (AllTrails links), food, and tips.
- A live **countdown** banner to the first day of the trip.
- **Per-day weather** via [Open-Meteo](https://open-meteo.com) (no API key),
  location-aware for each day. Days beyond the ~16-day forecast window show a
  placeholder that fills in automatically as the trip nears.
- Dark mode (default) with a light toggle, rounded playful design, swipe/arrow
  navigation.

To change the itinerary, edit the `TRIP` array in the `<script>` block of
`trips/2026/09/banff.html` — the whole UI renders from it.

## 🛠️ /SDF/SMON Report Generator (`PPTGenerator/`)

A browser tool that turns SAP `/SDF/SMON` monitoring output into a PowerPoint
report. Paste the SMON table, click **Generate Report**, and get a `.pptx` with
one chart per metric (via [PptxGenJS](https://gitbrent.github.io/PptxGenJS/)).
Reachable from the footer link on the trip page, or directly at
[`/PPTGenerator/SMONGenerator.html`](https://zulfi316.github.io/PPTGenerator/SMONGenerator.html).

- `codev1.5.js` — readable source of the generator logic.
- `codev1.5-m.js` — minified copy loaded by the page (keep in sync with the source).
- `pptgenx-lib.js` — vendored PptxGenJS library.

## Development & deployment

Everything is plain HTML/CSS/JS. To try changes, open the relevant HTML file in
a browser. Pushing to `main` triggers the GitHub Actions workflow
([`.github/workflows/static.yml`](.github/workflows/static.yml)), which deploys
the whole repo to GitHub Pages — no separate deploy step. (Pages source must be
set to **GitHub Actions** in the repo settings.)
