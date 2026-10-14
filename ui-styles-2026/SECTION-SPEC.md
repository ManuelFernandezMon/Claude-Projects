# Section spec (contract for every style section)

Project: `ui-styles-2026/` (plain HTML, CSS, vanilla JS, no framework, no build step). This file
is the contract each style author follows. `README.md` explains how to add a new style using it.

## What you own

For each style NN you are assigned you own exactly:

1. `css/NN-<slug>.css` (already exists as an empty stub). Everything inside it is scoped under `#s-NN`.
2. The markup between `<!-- SECTION NN START -->` and `<!-- SECTION NN END -->` in `index.html`.
3. `fonts/<batch>.txt` (new file): the Google Fonts `family=` parameters you need, one per line,
   e.g. `family=Space+Grotesk:wght@400;600`. The integrator merges these into ONE `<link>`.
   Max 2 families per style, request only the weights you use.
4. Optional extra files under `assets/NN-*` (SVG or small images). Keep them tiny.

You must NOT edit: `css/base.css`, `js/main.js`, `RESEARCH.md`, other styles' files, or `index.html`
outside your markers. If you need shared JS behaviour that `main.js` does not provide, say so in your
final report as `NEEDS main.js: ...` instead of adding script tags.

## Required markup (keep these classes, they are test hooks)

```html
<!-- SECTION NN START -->
<section id="s-NN" class="style-sec" data-style="NN" aria-labelledby="h-NN">
  <div class="s-wrap">
    <header class="s-head">
      <h2 id="h-NN">Style name</h2>
      <p class="s-def">One-sentence definition.</p>
    </header>
    <div class="s-info">
      <p class="s-best"><strong>Best for:</strong> ...</p>
      <p class="s-avoid"><strong>Avoid when:</strong> ...</p>
    </div>
    <div class="s-demo" role="group" aria-label="Live demo">
      <article class="demo-card">
        <h3>Card title</h3>
        <p>Card text.</p>
        <button type="button" class="demo-btn">Primary action</button>
      </article>
      <div class="demo-controls">
        <button
          type="button"
          role="switch"
          aria-checked="false"
          class="demo-switch"
          aria-labelledby="sw-NN-l"
        >
          <span aria-hidden="true" class="knob"></span>
        </button>
        <span id="sw-NN-l">Switch label</span>
        <label for="in-NN">Input label</label>
        <input id="in-NN" type="text" placeholder="Hint text" />
      </div>
    </div>
    <ul class="s-tags" aria-label="Key ingredients">
      <li>tag</li>
      <!-- 3 to 5 -->
    </ul>
    <div class="s-recipe">
      <button type="button" class="show-css" aria-expanded="false" aria-controls="css-NN">
        Show CSS
      </button>
      <div class="css-recipe" id="css-NN" hidden>
        <pre><code>/* at most 15 lines, real working CSS from this section */</code></pre>
        <button type="button" class="copy-css">Copy CSS</button>
        <span class="copy-status" role="status" aria-live="polite"></span>
      </div>
    </div>
    <div class="s-a11y" role="group" aria-labelledby="a11y-NN-h">
      <h3 id="a11y-NN-h">Accessibility note</h3>
      <p><strong>Main risk:</strong> ... <strong>Mitigation:</strong> ...</p>
    </div>
  </div>
</section>
<!-- SECTION NN END -->
```

You may add wrapper elements and purely decorative elements (mark them `aria-hidden="true"`), and
you may reorder the blocks visually with CSS as long as DOM order stays logical. Keep one `<h2>`;
use `<h3>` inside. Never use heading levels for styling. Real text only (no text in images).

## Behaviour provided by js/main.js (opt in via attributes, do not re-implement)

- `.style-sec` gets class `is-active` while on screen (plus a margin). **Put all heavy effects under
  `#s-NN.is-active`**: `backdrop-filter`, large blurs, animations, SVG filters, big shadows stacks.
  The inactive state must still look acceptable (static, no heavy effects).
- `button.show-css` toggles the `.css-recipe` it controls (also swaps its label to "Hide CSS").
- `button.copy-css` copies the `<code>` text and writes "Copied" into `.copy-status`.
- `button[role=switch]` flips `aria-checked`. Add `data-section-class="foo"` to also toggle class
  `foo` on your `<section>`. Style the switch off `[aria-checked="true"]`.
- Elements with `data-pointer` get `--px --py` (0..1) and `--mx --my` (-1..1) while the pointer is
  over them (only in active sections, never under reduced motion).

## CSS rules

1. Every selector starts with `#s-NN`. Custom properties are declared on `#s-NN` (never `:root`).
2. Set your own `font-family`, `color`, `background`, `line-height` on `#s-NN`. Nothing leaks in or out.
3. Demo controls (`.demo-btn`, `.demo-switch`, `input`, `.show-css`, `.copy-css`, card if interactive)
   need working `:hover`, `:focus-visible`, `:active` (and `[aria-checked=true]` for the switch).
   Focus indicator must be clearly visible against the style's own background (3:1 or better) and not
   removed. Touch targets at least 44px where the style allows (24px absolute minimum).
4. Contrast: every text/background pair at least 4.5:1 (3:1 for 24px+ or 19px+ bold text), including
   text over photos, gradients and glass. Compute ratios and write the key ones in a comment at
   the top of your CSS file. Where a style's signature effect hurts contrast, put text on a
   sufficiently solid plate. Do not fake it.
5. Layout: `min-height: 100svh` is already set on `.style-sec`. Must work from 320px to 1920px with no
   horizontal page scroll. Use `clamp()`, grid, and `rem` units for text so browser zoom works.
6. Motion: only `transform` and `opacity` animate. Any continuous or decorative animation must live under
   `@media (prefers-reduced-motion: no-preference)` and `#s-NN.is-active`. Provide the static look otherwise.
7. Respect `prefers-contrast: more` where the style has a weak contrast point (give it solid colours).
8. Limited-support features need `@supports` plus a readable fallback (see RESEARCH.md Part E):
   scroll-driven animations, `corner-shape`, relative colour syntax, anchor positioning, SVG filter
   `backdrop-filter: url()`. `backdrop-filter` needs the `-webkit-` prefixed twin.
9. Sections are self-contained: the section looks right whether the OS is in light or dark mode
   (pick the style's own scheme; do not depend on `prefers-color-scheme` unless the style is about it).
10. Do not use `!important` except to override your own inline SVG presentation attributes.
11. No external images, fonts or scripts other than Google Fonts via the integrator's link.
12. Formatting: run `prettier --write` on your CSS and on your section markup region (use the repo's
    `.prettierrc`). Keep CSS readable.

## Copy rules (facts and tone)

- Use `RESEARCH.md` (your batch's Part) for the definition, "Best for", "Avoid when" and the
  accessibility note. Paraphrase; do not invent facts. Anything marked unverified there must not be
  stated as fact (omit it or hedge it). No statistics or percentages that are not in RESEARCH.md
  with two sources.
- Definition is ONE sentence. "Best for" and "Avoid when" are one short sentence each.
- Accessibility note: one sentence of main risk, one of mitigation, matching what your demo does.
- Never use em-dashes or en-dashes as punctuation (use commas, periods, colons or a plain hyphen).
  No filler marketing words ("seamless", "elevate", "unleash"). No version labels, scroll cues,
  decorative status dots, or section-number eyebrows. Demo copy should be realistic and specific
  to the style (not "Lorem ipsum", not "Acme").
- Any sample or mock data shown in a demo must read as sample data.

## The CSS recipe (Show CSS)

At most 15 lines of real, copy-pasteable CSS that reproduces the signature of the style, taken from
(and consistent with) your own stylesheet. HTML-escape `<`, `>` and `&` inside `<code>`.

## Self-check before you report (use real tools)

1. Serve the project folder: `cd <worktree>/ui-styles-2026 && npx http-server . -p <PORT> -c-1 --silent &`
   (use the port your task gives you).
2. Screenshot your sections at widths 375, 768 and 1440 with Playwright (installed globally):
   ```js
   import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
   const b = await chromium.launch(); // bundled chromium is configured
   const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
   await p.goto('http://127.0.0.1:PORT/#s-NN');
   await p.locator('#s-NN').screenshot({ path: 'shots/NN-1440.png' });
   ```
   Put screenshots in the scratchpad dir your task gives you, NOT in the repo. LOOK at them with the
   Read tool and fix visible problems (overflow, clipped text, weak contrast, ugly spacing). Iterate.
3. Also check: no console errors; `document.documentElement.scrollWidth <= innerWidth` at 320 and 375;
   open the recipe (click Show CSS) and confirm it renders and fits; Tab to every control and confirm
   a visible focus ring; emulate `prefers-reduced-motion: reduce`.
4. `prettier --check` your files.
5. Commit on your worktree branch (do not push): message describing the batch, ending with the
   trailer lines your task gives you.
