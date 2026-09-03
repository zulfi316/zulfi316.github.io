# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A static site published via **GitHub Pages** at `zulfi316.github.io`. It hosts
two unrelated client-side things:

1. **Banff trip planner** (`trips/2026/09/banff.html`) — a mobile-first,
   day-by-day itinerary for a Sept 26 – Oct 4, 2026 Canadian Rockies trip,
   with a live countdown banner and per-day weather. The root `index.html`
   redirects here, so it's effectively the site's landing page.
2. **/SDF/SMON Report Generator** (`PPTGenerator/`) — paste tabular data from
   SAP's `/SDF/SMON` transaction into a textarea and the page generates a
   downloadable PowerPoint (`.pptx`) with one chart per metric.

Everything runs in the browser — there is no build step, no server, and no
dependencies to install. Open the HTML file and it works. Deployment is a
GitHub Actions workflow (`.github/workflows/static.yml`) that uploads the whole
repo to Pages on every push to `main` (Pages source must be set to
"GitHub Actions" in repo settings).

## Layout

- `index.html` — redirect to the Banff trip planner.
- `trips/2026/09/banff.html` — the Banff trip planner (self-contained: inline CSS + JS + data). Uses absolute asset paths, so it can live at any depth.
- `.github/workflows/static.yml` — GitHub Actions Pages deploy (whole repo, Jekyll bypassed).
- `PPTGenerator/SMONGenerator.html` — the SMON tool's UI. Loads the minified logic and the PptxGenJS library.
- `PPTGenerator/codev1.5.js` — **readable source** of the generator logic (`PPTGenerator` class). Edit this.
- `PPTGenerator/codev1.5-m.js` — **minified copy** of `codev1.5.js`; this is what the HTML actually loads.
- `PPTGenerator/pptgenx-lib.js` — vendored [PptxGenJS](https://gitbrent.github.io/PptxGenJS/) 3.2.1 (bundles JSZip). Do not edit.
- `PPTGenerator/css.css` — styling (dark theme).
- `PPTGenerator/favicon/` — favicons.

## How the Banff planner works

`trips/2026/09/banff.html` is fully self-contained. Near the top of its
`<script>` is a `TRIP` array — one object per day (`dow`, `date`, `iso`,
`emoji`, `title`, `loc` with lat/lon, and a list of typed `items`). **To edit
the itinerary, edit that array** — the UI renders from it. `item.kind` maps to
an emoji via the `ICONS` table (`drive`, `hike`, `food`, `cafe`, `tip`,
`warning`, `decision`, …).

- Weather comes from **Open-Meteo** (`api.open-meteo.com`, no API key), one
  multi-coordinate request covering every day's `loc`. Forecasts only reach
  ~16 days out, so days further away show a placeholder until the window
  catches up — this is expected, not a bug.
- The countdown targets `TRIP_START` (`2026-09-26T00:00:00-06:00`, Mountain
  time). Theme (dark default) persists to `localStorage`.
- Fonts load from Google Fonts; no other external dependencies.

## How the SMON generator works

`codev1.5.js` defines `PPTGenerator()`, which on `beginProcessing()`:
1. Reads the textarea, splits into lines, and locates the header row (looks for
   `AS Instance` / `Server Name` / `Act. WPs`).
2. Parses pipe-delimited (`|`) columns into a result set keyed by app server,
   identifying the Date, Time, App Server, and metric columns.
3. Builds one PptxGenJS chart slide per metric, mapping short SMON column names
   to human-readable titles (see the `switch` at the bottom of the file).

## Working conventions

- **The Banff planner is the landing page.** The root `index.html` redirects to
  `trips/2026/09/banff.html`. The SMON tool lives under `PPTGenerator/` and is
  reachable via the footer link on the trip page.
- **SMON: edit `codev1.5.js`, then regenerate `codev1.5-m.js`** — the HTML loads
  the minified file, so an edit to the source alone has no effect on the live
  page. Keep the two in sync.
- To bump the SMON version, update the `v 1.5` label in `SMONGenerator.html`
  and, by convention, the `codev1.5*.js` filenames + the `<script>` reference.
- To test either page, open its HTML file directly in a browser.
- Pushing to `main` triggers the GitHub Actions workflow, which deploys the
  whole repo to Pages — there is no separate deploy step.

## Notes

- The SMON page includes a Google Analytics tag (`UA-175059240-1`).
- `.che/` and the `.gitignore` entries are SAP Web IDE / Fiori tooling
  artifacts, unrelated to either page.
