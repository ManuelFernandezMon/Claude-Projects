# cold-cap-timer

Mobile-first web app to time the Penguin Cold Cap cycle during chemo. No build step, no dependencies: plain HTML + ES modules, data kept in the browser's `localStorage`.

## What it logs

Four actions per cap, each with a timestamp: **sacar** del cooler, **poner** en la cabeza, **quitar** de la cabeza, **meter** al cooler. From those it derives, per cap use: time in transit before reaching the head, time on the head, time back to the cooler, and total time out of the cooler.

A countdown starts when a cap is put on and alerts (sound + vibration + banner) when the swap interval is reached.

## Timings are configurable on purpose

The swap interval, number of caps and pre/post-cooling minutes are settings, not hardcoded. Public sources disagree (patient reports range from 15 to 30 minutes per cap, and post-cooling depends on the chemo regimen), so use the values in Penguin's written instructions and your oncology team's protocol. The default of 20 minutes is only a starting point.

## Install on Android

It is an installable PWA (manifest, service worker, icons; works offline after the first load). It needs to be served over **HTTPS** (or `localhost`) for Chrome to offer installation:

1. Open the deployed URL in Chrome on the Android phone.
2. Menu (⋮) → **Install app** / **Add to Home screen**.
3. Open it from the home-screen icon (full screen, no browser bar). Allow notifications when asked.

Limitation: a web app cannot guarantee an alarm while the phone is locked, because Android may pause background pages. The app requests a screen wake lock when a cap is put on, so keep it open and the screen on during the session. If locked-screen alarms matter, a native wrapper (e.g. Capacitor) with scheduled local notifications would be needed.

## Run

```
npm start      # serves on http://localhost:8080
npm test       # unit tests for logic.js
```

Open the served URL on a phone on the same network, or deploy the folder as a static site (Vercel project with Root Directory `cold-cap-timer`).
