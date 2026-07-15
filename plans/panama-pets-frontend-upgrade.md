# Panama Pets — Frontend Upgrade

## Context

Panama Pets (`panama-pets-website/`, React 19 + TS + Vite + Tailwind v4 + Framer Motion) already has a palette and type system genuinely sampled from the real clinic: green (#2f8f46) from the hand-painted storefront facade, a six-color "paw" rainbow from the sign's hand lettering, Baloo 2 (rounded display) + Inter (body). That grounding is good and stays untouched.

What reads as generic today is the *component vocabulary* layered on top of it: `ring-1 ring-clinic-green/10` + `rounded-2xl` cards, `whileHover={{ y: -4 }}` lift on every card, small numbered badges cycling accent colors, and a hero that tucks the one real photo of the actual shop into a small rounded card beside a text column — the exact "friendly SaaS startup" template shape, regardless of subject. The upgrade's job is to lean harder into the one truly distinctive asset (the hand-painted rainbow sign) as a real signature device, and let the real storefront photo anchor the hero instead of decorating it.

Confirmed via code read: `ServiceCard.tsx` has a 5-entry `ACCENTS` array (skips yellow) driving a numbered badge; `TestimonialCard.tsx` and `ServiceCard.tsx` both use `ring-1 ring-clinic-green/10` + `whileHover={{ y: -4 }}`; `SectionHeading.tsx` takes `{eyebrow, title, description}` only; `HomePage.tsx` hero is a `md:grid-cols-2` split with the photo in a `rounded-3xl` card on the right; `index.css` `@theme` block holds all color/font tokens exactly as documented below. `public/icons.svg` is confirmed dead (zero references) — unrelated purple social-icon sprite from a starter template.

## Design direction

**Signature element**: a hand-painted "brush-stroke" SVG motif — an organic, non-straight rule rendered as an SVG path, colored through the existing `paw-*` tokens in the sign's actual rainbow order (red → orange → yellow → teal → blue → purple). Used in exactly three places (restraint — one signature, not scattered):
1. Underline accent beneath the HomePage hero H1.
2. A section-divider row between the hero and the next section.
3. A top accent bar on `ServiceCard`, replacing the numbered badge.

`SectionHeading` optionally gets the same underline-under-H2 treatment (one placement per page, different `paw-*` color per page, following sign order) so the motif propagates consistently across Services/Testimonials/Gallery/About/Contact without inventing new decorative devices per page.

**Hero**: replace the small-photo-in-a-card-beside-text layout with the real storefront photo full-bleed across the viewport width, headline block centered immediately below it. This makes "this is a real place you can walk into" the first impression, not a generic split hero.

**Cards**: drop `ring-1 ring-clinic-green/10` + `whileHover={{ y:-4 }}` (both generic SaaS-card tells) in favor of a soft shadow-on-hover (CSS transition, not Framer spring — a net reduction in motion complexity) plus the brush-stroke top bar (`ServiceCard`) or a solid left border "plaque" treatment (`TestimonialCard`, deliberately *not* given a brush stroke, to keep the signature to 3 placements).

**Motion**: no new complexity. `useReducedMotion`'s global CSS `prefers-reduced-motion` rule already catches the new CSS-only hover transitions; `BrushStroke` itself is a static SVG with no animation.

## Implementation

### 1. New: `src/components/ui/BrushStroke.tsx`
- `PAW_SEQUENCE = ['red','orange','yellow','teal','blue','purple']`, `getPawColor(index)` cycling helper.
- `BrushStroke({ color, seed, className })` — inline `<svg aria-hidden="true" focusable="false" viewBox="0 0 240 20" preserveAspectRatio="none">` with one `<path fill-paw-{color}>`; 2–3 hardcoded organic path variants (wavy top/bottom edge, tapered ends), picked deterministically from `seed` so repeats don't look identical. `fill-paw-*` works for free — Tailwind v4 auto-generates fill/stroke/bg/text utilities from every `@theme` token, no new CSS needed.
- `BrushDivider({ className })` — row of 6 `BrushStroke`s (one per `PAW_SEQUENCE` color), slight overlap + small static per-index translate-y jitter (inline style, not Framer) for a hand-painted feel.
- Purely decorative, no animation — trivially respects reduced motion.

### 2. `src/index.css`
- No new color/type tokens needed (existing `paw-*` tokens cover it; Tailwind's default scale already reaches `text-7xl`+ for the bigger H1).
- Add `overflow-x: hidden;` to `body` — needed because the full-bleed hero band uses the `left-1/2 right-1/2 -mx-[50vw] w-screen` breakout trick, which can add a stray horizontal scrollbar in some browsers.

### 3. `src/pages/HomePage.tsx` — hero restructure
Replace the current `md:grid-cols-2` hero (`HomePage.tsx:22-74`) with:
- Full-bleed photo band (`left-1/2 right-1/2 -mx-[50vw] w-screen`, `h-[42vh] sm:h-[52vh] md:h-[60vh]`) using `storefrontImg`, `fetchPriority="high"`, no `loading="lazy"` (this is the LCP element). Keep the existing descriptive `alt` text.
- Centered headline block below it on the existing `bg-clinic-green-light`: eyebrow, H1 bumped from `text-4xl sm:text-5xl` to `text-5xl sm:text-6xl lg:text-7xl` with a `BrushStroke color="red"` underline beneath it, intro paragraph, CTAs + `RatingBadge` now centered instead of left-aligned.
- `BrushDivider` on the seam into the Highlights section.
- Drop the old photo-card `motion.div` scale-in wrapper (no longer applicable to a full-bleed band); keep the existing `staggerContainer`/`fadeUp` stagger for the text block.
- Rest of the page (Highlights grid, exam-room/testimonial section, map CTA banner) stays structurally the same — it inherits the card updates from steps 4–5 automatically.

### 4. `src/components/ui/ServiceCard.tsx`
- Remove the `ACCENTS` array and numbered badge `<span>`.
- Card shell: drop `ring-1 ring-clinic-green/10`, replace `shadow-sm` with a soft shadow that deepens on hover via CSS `transition-shadow` (not Framer).
- Convert the wrapping `motion.div` → plain `div` (drop `whileHover`/`whileTap`/spring transition) — callers already wrap each card in their own animated `motion.div` for entrance, so this only removes the redundant hover spring.
- First child: `<BrushStroke color={getPawColor(index)} seed={service.id} className="h-2.5 w-full sm:h-3" />`, flush to the card's rounded top (clipped automatically by the card's `overflow-hidden rounded-2xl`), then existing title/description in a `p-6` wrapper.
- Props unchanged (`service, index`) — no changes to `services.ts`.

### 5. `src/components/ui/TestimonialCard.tsx`
- Same ring-removal + CSS-hover-shadow + `motion.div`→`div` cleanup as `ServiceCard`.
- No `BrushStroke` here (keeps the signature to exactly 3 placements) — instead a `border-l-4 border-clinic-green-dark` "plaque" edge to visually differentiate it from `ServiceCard`.
- Props/markup otherwise unchanged (stars, quote, truncated-source link) — no changes to `testimonials.ts`.

### 6. `src/components/ui/SectionHeading.tsx`
- Add optional `showBrush?: boolean` and `brushColor?: PawColor`. When set, render a `BrushStroke` under the `<h2>` at a smaller scale than the hero H1 treatment (e.g. `h-2.5 w-24 sm:h-3 sm:w-28`).
- Enable on exactly one `SectionHeading` call per page — Services=`orange`, Testimonials=`yellow`, Gallery=`teal`, About=`blue`, Contact=`purple` (hero already used `red`), matching sign order. One-line addition per page file; no structural changes. Leave `Navbar`/`Footer` untouched (Navbar already has its own signature motion device — the `layoutId` active-link underline — and doubling up would compete with it; Footer's dark background isn't a good fit for the paw palette without contrast rework).

### 7. Cleanup
- Delete `public/icons.svg` (confirmed unused).

## Accessibility

- All `BrushStroke`/`BrushDivider` SVGs: `aria-hidden="true" focusable="false"`, never interactive, never the sole conveyor of information.
- Hero image keeps real descriptive `alt` text (content-bearing, not decorative).
- `ServiceCard`/`TestimonialCard` hover changes move from Framer `whileHover` to CSS `transition-shadow`, which the existing global `@media (prefers-reduced-motion: reduce)` block in `index.css` already zeroes (it targets all `transition-duration`, not just Framer-driven ones).
- Confirm the `motion.div` → `div` conversion doesn't introduce any `overflow-hidden` ancestor around a focusable element that would clip the browser's default focus ring (this codebase has no custom `focus-visible:` styles anywhere today, so the default outline is what's protecting keyboard users).

## Verification

1. `npm run dev`; check HomePage at 375px / 768px / 1280px+ — full-bleed hero band shouldn't introduce a horizontal scrollbar; H1 + underline + divider align cleanly at each breakpoint.
2. DevTools emulate `prefers-reduced-motion: reduce` — page transitions still fire but instantly, card hover shadows are instant, hero stagger appears without translate/opacity animation.
3. Tab through hero CTAs, nav links, "See all services →" / "Read more reviews →", gallery lightbox open/close — visible focus outline throughout.
4. Visually confirm `ServiceCard` renders correctly for all 5 `services.ts` entries (ServicesPage) and the sliced 3 (HomePage) with colors cycling through all 6 `PAW_SEQUENCE` values; confirm `TestimonialCard` renders both `testimonials.ts` entries, including the `truncated` one's source-note link.
5. `npm run lint` and `npm run build` (runs `tsc -b`) — confirm the new optional `SectionHeading` props don't break existing call sites, confirm `icons.svg` removal doesn't break anything.
6. Rough LCP sanity check: hero band has a fixed `h-[…]`/`min-h-[280px]` so no layout shift while the photo loads.
