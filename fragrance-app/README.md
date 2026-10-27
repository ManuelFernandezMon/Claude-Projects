# Fragrance App

Read-only web app (installable PWA) for browsing the fragrance collection: ratings, a
"what should I wear" picker, the wishlist, video scripts/research, and a few insights.
No framework, no dependencies, no backend — plain HTML/CSS/JS, free to host anywhere static.

## How data gets in

The markdown files in [`../fragrance-content/`](../fragrance-content/README.md) stay the
single source of truth. `build.mjs` reads `collection.md`, `wishlist.md`, `content/`, and
`research/` and writes `public/data.json`, which the page loads.

**After changing anything in `fragrance-content/`, regenerate and commit the data:**

```sh
node fragrance-app/build.mjs
```

CI fails if `public/data.json` is out of date.

## Run locally

```sh
cd fragrance-app
npm start   # builds data.json, serves http://localhost:4173
```

## Deploy (free)

It's a static site: publish the `public/` folder.

- **Vercel (free Hobby plan):** new project from this repo, Root Directory `fragrance-app`,
  Framework Preset "Other", Output Directory `public`, no build command (data.json is committed).
- **GitHub Pages:** works if the repo is public (private repos need a paid plan).

Once deployed, open the URL on your phone and use "Add to Home Screen" to install it.

## Editing

The app is read-only on purpose. To add or rate a perfume, update the wishlist, or write
a script, ask Claude in your session; it edits the markdown, rebuilds `data.json`, and pushes.
