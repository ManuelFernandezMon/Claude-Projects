# Panama Pets Website

A marketing website for [Panama Pets](https://maps.app.goo.gl/XKvGz1NMwMeHDXPB7), a veterinary
clinic in Panama City led by Dr. Hugo Turillazzi. Built with Vite, React, TypeScript, Tailwind CSS,
and Framer Motion.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your Formspree endpoint (see below)
npm run dev
```

Other scripts: `npm run build`, `npm run preview`, `npm run lint`, `npm run format`.

## Wiring up the contact form (Formspree)

The contact form on `/contact` posts to `VITE_FORMSPREE_ENDPOINT`, read from `.env`.

1. Create a free account at [formspree.io](https://formspree.io) and create a form.
2. Copy the form endpoint (`https://formspree.io/f/xxxxxxx`).
3. Put it in `.env`: `VITE_FORMSPREE_ENDPOINT=https://formspree.io/f/xxxxxxx`.

Without this set, the form will show an error state instead of submitting.

## Content to finalize before launch

This site was built from a Google Maps listing and a handful of real clinic photos. A few things
are placeholders on purpose and should be confirmed with the clinic before publishing:

- **Hours** — not available on the Google listing at build time. `src/data/clinicInfo.ts` has
  `hours: null`; the Contact page shows a "coming soon" note instead. Fill in real hours once known.
- **Services** — the list in `src/data/services.ts` is inferred from equipment visible in clinic
  photos (exam table, autoclave, oxygen concentrator, pharmacy shelves, boarding kennels, delivery
  van), not an official service list. Confirm exact services/pricing with the clinic.
- **Katherine L. Quiro's review** — the source screenshot cut this review off mid-sentence. It's
  trimmed to a complete clause in `src/data/testimonials.ts` and marked `truncated: true`. Either
  get the full text from the Google listing or swap in a different complete review.
- **Formspree endpoint** — see above.

## Image pipeline

The real clinic photos (storefront, exam room, pharmacy, equipment, boarding kennels) started as
Google Maps app screenshots showing grids of multiple photos plus app UI. `scripts/crop-images.py`
crops the individual photos out of those grids into `src/assets/images/`.

The raw screenshot grids themselves aren't committed (they contain phone UI and other Google Maps
contributors' unrelated photos). If better source photos become available later:

1. Put the new screenshots in `scripts/source-grids/` (gitignored).
2. Update the crop boxes in `scripts/crop-images.py` — open the source image in an image viewer to
   find the right pixel coordinates, since exact grid boundaries vary per screenshot.
3. Run `python3 scripts/crop-images.py` (requires `pip install Pillow`).

## Project structure

- `src/data/` — single source of truth for clinic info, services, and testimonials
- `src/pages/` — one file per route (Home, About, Services, Gallery, Testimonials, Contact)
- `src/components/layout/` — Navbar, Footer, page-transition wrapper
- `src/components/ui/` — shared presentational components (cards, badges, scroll-reveal wrapper)
- `src/components/contact/` — contact form, validation schema, map embed
- `src/lib/motionVariants.ts` — shared Framer Motion animation variants
- `src/hooks/useReducedMotion.ts` — collapses animations to instant/opacity-only when the user has
  requested reduced motion
