# cold-cap-timer

Mobile-first web app to time the Penguin Cold Cap cycle during chemo. No build step, no dependencies: plain HTML + ES modules, data kept in the browser's `localStorage`.

## What it logs

Four actions per cap, each with a timestamp: **sacar** del cooler, **poner** en la cabeza, **quitar** de la cabeza, **meter** al cooler. From those it derives, per cap use: time in transit before reaching the head, time on the head, time back to the cooler, and total time out of the cooler.

A countdown starts when a cap is put on and alerts (sound + vibration + banner) when the swap interval is reached.

## Timings are configurable on purpose

The swap interval, number of caps and pre/post-cooling minutes are settings, not hardcoded. Public sources disagree (patient reports range from 15 to 30 minutes per cap, and post-cooling depends on the chemo regimen), so use the values in Penguin's written instructions and your oncology team's protocol. The default of 20 minutes is only a starting point.

## Run

```
npm start      # serves on http://localhost:8080
npm test       # unit tests for logic.js
```

Open the served URL on a phone on the same network, or deploy the folder as a static site (Vercel project with Root Directory `cold-cap-timer`).
