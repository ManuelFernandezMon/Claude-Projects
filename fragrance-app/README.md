# Fragrance App

Installable app for managing the fragrance collection: add, edit, re-rate, re-categorize and
delete perfumes, a wishlist, video ideas, a "describe your occasion" recommender, and insights.
No framework, no dependencies, no backend — plain HTML/CSS/JS. Free to host and free to build.

It runs three ways from the same code in `public/`:

| Where | How |
|---|---|
| **Android app (APK)** | Built by GitHub Actions (`fragrance-app-apk.yml`) with Capacitor; see below |
| **Website / PWA** | Static site on Vercel, "Add to Home Screen" |
| **Local** | `cd fragrance-app && npm start` → http://localhost:4173 |

## Where your data lives

- **On the device.** Edits are saved in the app's local storage (per phone/browser). Nothing
  is sent anywhere, and the web version and the APK do not share data.
- **First launch** seeds the app from `public/data.json`, which `build.mjs` generates from the
  markdown in [`../fragrance-content/`](../fragrance-content/README.md). Later changes to
  `data.json` never overwrite what you've edited on a device.
- **Backup:** More tab → "Copy backup (JSON)". Restore by pasting it back.
- **Sync with Claude:** More tab → "Copy as markdown for Claude", paste it into a session and
  ask Claude to update `collection.md` / `wishlist.md`; it rebuilds `data.json` and pushes.

After changing anything in `fragrance-content/`, regenerate the starter data and commit it:

```sh
node fragrance-app/build.mjs
```

CI fails if `public/data.json` is out of date.

## The recommender

`public/recommend.js` is a keyword matcher (English and Spanish), not an AI model. It reads the
occasion text and tags you pick, then ranks your bottles by your own occasion tags, ratings, and
notes (fresh vs. heavy vs. sweet), leaning fresher if "I live somewhere hot" is on.

## Android APK

GitHub builds a debug APK on every push that touches `public/` or `mobile/`
(or run **Actions → fragrance-app APK → Run workflow**). The result is published as the
**`apk-latest` release** (Releases page of the repo) and as a workflow artifact.

To install: open the APK on your phone (signed in to GitHub if the repo is private), allow
"Install unknown apps" for your browser when asked, then tap Install. It is a debug build signed
with a throwaway key, so Play Protect may warn; installing a newer APK over an old one works
as long as it came from this same workflow.

`mobile/` is a small Capacitor project (`capacitor.config.json`) that packages `../public`.
The `android/` folder is generated in CI and is not committed.

## Deploy the website (free)

Static site: publish `public/`. Vercel Hobby: Root Directory `fragrance-app`, Framework "Other",
Output Directory `public`, build command `echo data.json is committed`.
