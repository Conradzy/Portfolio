# Conradzz Portfolio

A one-page cinematic portfolio for **Raymond Conrad S. Napiñas (Conradzz)** — implemented
from the Claude Design handoff bundle (`portfolioremon/`).

The original prototype was authored inside Claude Design's `<x-dc>` / `DCLogic` runtime.
This is a standalone, framework-free recreation:

```
site/
├── index.html        # markup + all styling (Inter Tight / Space Grotesk / JetBrains Mono)
├── app.js            # all interactivity (loader, typing hero, particles, sniper-scope cursor,
│                     #   scroll reveals, count-up stats, tech carousel, timeline, projects + modal)
├── sniper-scene.js   # Three.js scroll-driven 3D sniper scene (ES module, loads from CDN importmap)
└── assets/           # logos, portrait, project screenshots, GLB models, muzzle-flash / smoke videos
```

## Running it

Because the page uses ES modules, an import map, and fetches `.glb` models + `.mp4` video
textures, it **must be served over HTTP** — opening `index.html` via `file://` will fail
(CORS / module restrictions). Any static server works:

```bash
# from this folder
python -m http.server 8000
# then open http://localhost:8000
```

```bash
npx serve .          # or: npx http-server .
```

An internet connection is required on first load for the Google Fonts and the Three.js
modules (pulled from the jsDelivr CDN via the import map in `index.html`).

## Sections

Hero (typing headline, centered portrait, count-up stats) → About → **3D Sniper** (fires on
scroll: muzzle flash, smoke, 3D bullet + red laser beam) → Skills → Tech Stack carousel →
BSIT Journey timeline → Projects (grouped by year, web/mobile sub-groups, click-to-open
modals) → Contact form → Footer. Backgrounds alternate red ↔ black between sections.

## Projects — images & links

Real screenshots are wired in for **Gym Workout, IRS CenterPoint, FireOps, and DropPoint
Website**. The **DropPoint Website** card cross-fades on a loop between two images (landing
page ↔ award certificate). FireOps links to its capstone repo
(`github.com/kobedumandan/bfp_capstone`), and a new **PhilHealth — Figma Design** card sits
beside DropPoint Website and opens the Figma prototype.

- **One image still needed: PhilHealth.** Save the PhilHealth screenshot to
  `site/assets/philhealth.png`. Until then that card automatically shows the striped
  "screenshot placeholder" (no broken image) — drop the file in and it appears, no code
  change needed. Any missing project image degrades to the placeholder the same way.
- Email / Facebook / LinkedIn links in the Contact section are still placeholders; the
  GitHub links, the DropPoint repo/live-demo links, and the PhilHealth Figma link are real.
