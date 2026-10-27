# cold-cap-timer

Mobile-first web app to time the Penguin Cold Cap cycle during chemo. No build step, no dependencies: plain HTML + ES modules, data kept in the browser's `localStorage`.

## Tell it what happened

The app does the math. Type (or dictate with the keyboard mic) what happened, in Spanish, and it works out the action, the cap number and the real time, shows what it understood, and saves on **Guardar**:

- `hace 3 min le puse un cap`
- `quité el cap hace 2 minutos y puse el 2`
- `saqué el cap 3 del cooler hace 1 minuto`
- `terminó la quimio hace 5 minutos` / `a las 10:15 puse el cap 2`

When no cap number is said it follows the rotation (next cap out of the cooler, the one already taken out gets put on, etc.). An action without its own time shares the time of the previous one, so "hace 3 min quité el cap y puse el 2" logs both 3 minutes ago. The parser is plain rules in `logic.js` (no AI service, works offline).

From the log it always shows what to do now (take out cap N, remove cap M, put on cap N, put cap M back), when the next swap is, and an estimated plan with the following swaps plus the pre/post-cooling milestones when those are set.

## What it logs

Four actions per cap, each with a timestamp: **sacar** del cooler, **poner** en la cabeza, **quitar** de la cabeza, **meter** al cooler. From those it derives, per cap use: time in transit before reaching the head, time on the head, time back to the cooler, and total time out of the cooler.

A countdown starts when a cap is put on and alerts (sound + vibration + banner) when the swap interval is reached.

## Design

Glassmorphism with a minimal layout: translucent cards (`backdrop-filter`, inner highlight, tinted shadow; solid fallback under `prefers-reduced-transparency`), one teal accent, amber and coral only as state colors, light and dark themes. Motion is functional (the swap ring drains and glides when a cap is re-placed, a notch marks when to pull the next cap, the sliding selectors, accordions and instruction changes ease out) and collapses under `prefers-reduced-motion`.

Assets are self-hosted so the app works offline: [Geist](https://github.com/vercel/geist-font) variable font (SIL OFL 1.1, license in `fonts/`) and [Phosphor](https://phosphoricons.com) icons (MIT), inlined as an SVG sprite in `index.html`. The page deliberately has no `viewport-fit=cover` (see the comment in `<head>`).

## Protocol (Penguin 3-cap dry-ice schedule)

The defaults come from the patient's personal Penguin schedule: pre-cooling of 50 minutes before treatment (cap 1 for 20 min, cap 2 for 20 min, cap 3 for 10 min), the infusion starts once cap 3 has been worn 10 minutes (25 minutes in total for that cap), then a cap change every 25 minutes rotating the 3 caps, and caps stay on for at least 6 hours after the main infusion is finished.

How that is modelled (`logic.js`): `schedule` is the wear time of each placement in order and its last value repeats (`20, 20, 25`), so the n-th cap placed gets its own countdown. `pre` (50) gives the moment the infusion can start (10 minutes into cap 3, projected from the latest placement and replaced by the real one), with an alarm "Ya puede empezar la infusión". Tapping **Terminó la infusión** starts `post` (360 min); the cap whose time reaches the end of post-cooling is the last one and simply comes off at that moment. The default `lead` of 5 minutes is when to take the next cap out of the cooler. **Ajustes > Usar el protocolo de mi hoja de Penguin** restores all of this, and the sheet's key points are summarized there.

## Timings are configurable on purpose

The wear times, number of caps and pre/post-cooling minutes are settings. Public sources disagree and the right values depend on the regimen, so they follow the personal Penguin schedule above; change them only if the oncology team or Penguin says so.

## Install on Android

It is an installable PWA (manifest, service worker, icons; works offline after the first load). It needs to be served over **HTTPS** (or `localhost`) for Chrome to offer installation:

1. Open the deployed URL in Chrome on the Android phone.
2. Menu (⋮) → **Install app** / **Add to Home screen**.
3. Open it from the home-screen icon (full screen, no browser bar). Allow notifications when asked.

The Android APK (see `../cold-cap-timer-android`) adds OS-scheduled alarms and a persistent live-countdown notification, which the PWA cannot do.

Limitation of the PWA: a web app cannot guarantee an alarm while the phone is locked, because Android may pause background pages. The app requests a screen wake lock when a cap is put on, so keep it open and the screen on during the session. If locked-screen alarms matter, a native wrapper (e.g. Capacitor) with scheduled local notifications would be needed.

## Run

```
npm start      # serves on http://localhost:8080
npm test       # unit tests for logic.js
```

Open the served URL on a phone on the same network, or deploy the folder as a static site (Vercel project with Root Directory `cold-cap-timer`).
