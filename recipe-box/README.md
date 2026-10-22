# recipe-box

A personal recipe app for the kitchen, built mobile-first. Single user, no backend, no accounts.
Recipes, photos, categories and checklist state live in the browser's **IndexedDB**.

**Stack:** Vite 8 · React 19 · TypeScript 7 · [`idb`](https://github.com/jakearchibald/idb) 8 · plain CSS · `react-router-dom`. The optional import feature adds one Vercel serverless function (`api/extract.ts`) that calls the Anthropic API.

## Features

- Recipes with ordered steps, ingredients (name + optional quantity), prep/cook time, servings, notes.
- Photos: upload or camera capture; resized to max 1600 px and re-encoded as JPEG 0.8 before storing.
- Per-recipe ingredient checklist; state persists, with a "Reset checklist" button.
- Custom colored categories (create, rename, recolor, delete). Deleting a category never deletes recipes.
- Home grid with multi-select category filter (matches **any** selected), search (title + ingredients), sort (newest / A-Z).
- **Import from a TikTok/Instagram link:** paste the link and the video's caption; Claude turns it into a recipe (ingredients with quantities, steps, times, categories) that you review before saving. Imported ingredients become the interactive checklist.
- Backup page: export everything to one JSON file (photos embedded as base64); import with **merge** or **replace**.
- Three clearly labeled **SAMPLE** recipes on first run. Delete them from the home page; they will not come back.

## Local development

```bash
cd recipe-box
npm install
cp .env.example .env.local   # only needed for "Import from link"; see below
npm run dev        # http://localhost:5173 (also serves /api/extract)
npm run build      # type-check (tsc -b) + production build into dist/
npm run preview    # serve dist/ locally
```

Testing on a phone over your LAN works (`npm run dev -- --host`), but over plain `http://` the browser treats the page as
an insecure context: `navigator.storage` (persistent storage) is unavailable there. IDs fall back to `getRandomValues`
because `crypto.randomUUID()` is also secure-context only. Deploy a preview to Vercel (HTTPS) for realistic phone testing.

## Deploy to Vercel

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project**, import the repo.
3. Set **Root Directory** to `recipe-box` (this repo is a monorepo).
4. Framework preset is detected as Vite (`vercel.json` also pins `npm run build` and `dist`). Deploy.

`vercel.json` rewrites every path to `index.html` so deep links such as `/recipes/<id>` work on refresh.

## Import from TikTok / Instagram links

How it works: you paste a link and the caption text on `/import`. The browser posts the caption to `/api/extract`, a
Vercel function that asks Claude for a structured recipe, then opens the normal editor pre-filled so you can **review and
fix it before saving**. The link is stored on the recipe as its source.

**Setup (required, otherwise the page shows a "not configured" error):**

1. Create an API key in the [Anthropic Console](https://platform.claude.com/).
2. Pick a long random string as `RECIPE_IMPORT_PASSCODE`.
3. Locally: put both in `.env.local` (see `.env.example`). On Vercel: add `ANTHROPIC_API_KEY` and
   `RECIPE_IMPORT_PASSCODE` under *Project → Settings → Environment Variables*, then redeploy.
4. The first time you import on a device, the app asks for the passcode and remembers it on that device.

**Why a passcode:** the function is a public URL that spends your API credits. Without the passcode, anyone who finds the
URL could run up your bill. The passcode is compared in constant time and never sent to Anthropic.

**Cost:** one import is a single short request (a caption is typically well under 1,000 tokens). The default model is
`claude-opus-5-5` at low effort; set `RECIPE_IMPORT_MODEL` to use a cheaper model. Check current prices on Anthropic's
pricing page. Set a spend limit in the Console as a safety net.

**Limits you should know about:**

- **Instagram:** no automatic reading. Instagram's oEmbed needs a Meta app token and the public page requires login, so
  you copy the caption and paste it.
- **TikTok:** the app tries TikTok's public oEmbed endpoint to prefill the caption. It can return nothing (private,
  removed, or short links); then you paste the caption.
- **Spoken-only recipes** (ingredients said in the video, not written in the caption) can't be read. Downloading and
  transcribing videos would violate both platforms' terms, so it is deliberately not supported.
- **AI can be wrong.** It is told not to invent quantities, but always compare against the video.
- Importing needs an internet connection. Everything else still works offline.
- Captions are untrusted text: they are wrapped in delimiters and the model is told to treat them as data. The output is
  only structured fields that you review, and saved links must be `http(s)`.

## Where the data lives, and its limits

**Your data exists only in the browser profile you used to create it.** There is no sync and no server copy.

- Clearing site data, uninstalling the browser, a private window, or a different browser/device means an **empty** app.
- The app calls `navigator.storage.persist()` at startup to make eviction less likely, but browsers may refuse
  (the Backup page shows whether it was granted). It is a mitigation, not a guarantee.
- Different origins do not share data: `localhost`, a Vercel preview URL and your production URL are separate databases.
- **Back up regularly** from the Backup page. Backup files embed photos, so they can be several MB.
- Fonts are loaded from Google Fonts; offline, the app falls back to system monospace/sans-serif fonts.

Merge semantics on import: items with the same ID are overwritten by the backup (an imported recipe also replaces its
photos); everything else is kept. Replace erases all current data first.

## Architecture

```
src/
  types.ts                 data model
  storage/
    recipeStore.ts         RecipeStore interface + the exported singleton the UI uses
    idbRecipeStore.ts      IndexedDB implementation (stores: recipes, categories, images, meta)
    seed.ts, backup.ts     sample data; JSON export/import + validation
api/extract.ts             Vercel function entry (Web-standard fetch handler)
server/extractRecipe.ts    prompt, schema and request handling for /api/extract
  hooks/                   data context, object-URL helpers
  components/, pages/      small typed React components and routes
  styles/                  tokens.css, base.css, components.css (plain CSS)
```

Photos are stored as Blobs in their own store, so listing recipes never loads image data.
Checklist state is stored on the recipe (`checked` = ingredient IDs).

**Swapping to Supabase later:** implement the `RecipeStore` interface (`src/storage/recipeStore.ts`) and change the one
assignment at the bottom of that file. The UI imports nothing else from the storage layer except the backup helpers,
which use `exportSnapshot()` / `importSnapshot()` from the same interface.
