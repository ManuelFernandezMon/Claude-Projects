# UI Styles 2026

A single-page showcase of 20 current web UI design styles as live, interactive demos. Each style
has a definition, "Best for" and "Avoid when" lines, a working demo (card, button, switch, input),
key-ingredient tags, a copyable "Show CSS" recipe and an accessibility note. A comparison table
rates depth, readability risk and momentum for all 20.

Plain HTML, CSS and vanilla JavaScript. No framework and no build step. Google Fonts is the only
external resource.

Sources and verification status for every claim are in [`RESEARCH.md`](RESEARCH.md). Momentum
labels (rising, stable, cooling) are qualitative editorial judgments: no source provided adoption
data. Liquid Glass is a CSS approximation: true refraction is not possible in plain CSS, and Apple
publishes no web CSS for it.

## Run it locally

```bash
npm install          # dev tooling only; the site itself has no dependencies
npm run serve        # http://127.0.0.1:4173
```

## Structure

```
index.html            hero, sticky nav, 20 <section id="s-NN">, comparison table, footer
css/base.css          page chrome only (hero, nav, table, footer) and shared section scaffolding
css/NN-<slug>.css     one file per style, every selector scoped under #s-NN
js/main.js            shared behaviour: lazy CSS, activation, nav indicator, Show CSS, copy, switches
assets/               the Liquid Glass photo (credit in assets/CREDITS.md) and two pixel sprites
fonts/*.txt           the Google Fonts families each batch asked for (merged into one <link>)
scripts/verify/       Playwright, axe, Lighthouse and lint-style checks (see below)
RESEARCH.md           sources, verification status, CSS browser-support table
SECTION-SPEC.md       the contract every style section follows
```

How loading works: only `base.css` blocks first paint. Each `<section>` carries
`data-css="css/NN-<slug>.css"`; `main.js` loads that file about one viewport before the section is
needed and adds `css-ready` (until then the section is `visibility: hidden`, so there is no flash
of unstyled content). A `<noscript>` block loads everything and unhides the sections when
JavaScript is off. Heavy effects (backdrop-filter, big blurs, animation, SVG filters) live under
`#s-NN.is-active`, a class `main.js` toggles with an IntersectionObserver.

## Add a style

1. Pick the next number `NN` and a slug. Create `css/NN-<slug>.css`.
2. Copy any existing `<!-- SECTION NN START --> ... <!-- SECTION NN END -->` block in `index.html`
   and change the ids (`s-NN`, `h-NN`, `css-NN`, `sw-NN-l`, `in-NN`, `a11y-NN-h`). Keep the classes
   listed in [`SECTION-SPEC.md`](SECTION-SPEC.md) and set `data-css` to your stylesheet.
3. Scope every selector under `#s-NN`, declare custom properties on `#s-NN` (never `:root`), and put
   heavy effects under `#s-NN.is-active`. Give the demo controls hover, `:focus-visible` and
   `:active` states, and provide a reduced-motion and `prefers-contrast: more` fallback if the
   style needs one.
4. Add the Google Fonts `family=` parameters to the single `<link>` in `<head>` (keep weights few).
5. Add the style to the hero index, the sticky nav and the comparison table.
6. Write a recipe of at most 15 lines using real values from your stylesheet, then run the checks
   below. `npm run verify:recipes` fails if a number or colour in a recipe is not in the stylesheet.

## Verify

With `npm run serve` running in another terminal:

| Command                                         | What it checks                                                                                   |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run lint:html`, `lint:css`, `format:check` | html-validate, stylelint, prettier                                                               |
| `npm run verify:console`                        | no console errors, failed requests or 4xx, in light, dark and reduced motion                     |
| `npm run verify:axe`                            | axe-core (WCAG 2.2 A/AA + best practice) in light, dark, reduced motion and 375px                |
| `npm run verify:contrast`                       | pixel-based text contrast against real backgrounds (photos, gradients, glass)                    |
| `npm run verify:keyboard`                       | Tab walk over every control, visible-focus pixel diff, Show CSS and switches by keyboard         |
| `npm run verify:overflow`                       | no clipped or overflowing content from 320px to 1920px                                           |
| `npm run verify:recipes`                        | every recipe value exists in its stylesheet, at most 15 lines                                    |
| `npm run verify:preferences`                    | reduced motion stops animation; `prefers-contrast: more` and the transparency switch remove blur |
| `npm run verify:nojs`                           | sections stay visible and styled with JavaScript off                                             |
| `npm run verify:shots`                          | screenshots of every section at 375, 768 and 1440 into `shots/`                                  |
| `npm run verify:lighthouse`                     | Lighthouse mobile and desktop, JSON in `reports/`                                                |

Chromium is found at `/opt/pw-browsers/...` or via `CHROME_PATH`; set `BASE_URL` to test a
deployed URL.

## Deploy (Vercel)

This repo is a monorepo, so give the project its own Vercel project with **Root Directory** set to
`ui-styles-2026`, framework preset **Other**, no build command and no output directory (the folder
is served as-is). `vercel.json` enables clean URLs and short asset caching.

```bash
# from the repo root, with the Vercel CLI logged in
cd ui-styles-2026 && vercel          # preview deployment
cd ui-styles-2026 && vercel --prod   # production
```

CI (`.github/workflows/ui-styles-2026-ci.yml`) runs html-validate, stylelint and prettier on changes
to this folder.

## Credits

Liquid Glass backdrop photo: "Beautifull night" by Nima Mot on Unsplash (see
[`assets/CREDITS.md`](assets/CREDITS.md)). Fonts from Google Fonts under their own licences.
