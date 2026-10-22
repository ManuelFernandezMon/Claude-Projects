# recipe-box

A personal recipe app for the kitchen, built mobile-first. Single user, no backend, no accounts.
Recipes, photos, categories and checklist state live in the browser's **IndexedDB**.

**Stack:** Vite 8 · React 19 · TypeScript 7 · [`idb`](https://github.com/jakearchibald/idb) 8 · plain CSS · `react-router-dom`. The optional AI features add two Vercel serverless functions (`api/extract.ts`, `api/generate.ts`) that call an AI provider: Google Gemini (has a free tier) or Anthropic Claude (paid).

## Features

- Recipes with ordered steps, ingredients (name + optional quantity), prep/cook time, servings, notes.
- Photos: upload or camera capture; resized to max 1600 px and re-encoded as JPEG 0.8 before storing.
- Per-recipe ingredient checklist; state persists, with a "Reset checklist" button.
- Custom colored categories (create, rename, recolor, delete). Deleting a category never deletes recipes.
- Home grid with multi-select category filter (matches **any** selected), search (title + ingredients), sort (newest / A-Z).
- **Ask AI for a recipe:** describe what you want ("gluten-free banana bread for 8"); the AI writes a full recipe, you can ask for changes ("make it vegan"), then open it in the editor to review and save. AI recipes are labeled as untested.
- **Import from a video:** upload a video you saved from TikTok/Instagram (or a screen recording) and the AI watches and listens to it, so no caption is needed. Or paste the caption instead. Either way the AI turns it into a recipe (ingredients with quantities, steps, times, categories) that you review before saving. Imported ingredients become the interactive checklist.
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

## AI features: setup, cost and limits

Both AI features (**Ask AI** and **Import link**) use the same server setup and passcode.

### Setup (required for both features; otherwise the page shows a "not configured" error)

Choose a provider. Both features work the same with either.

| | **Gemini (free tier)** | **Claude (Anthropic, paid)** |
|---|---|---|
| Cost | Free-of-charge tier for the models listed on [Google's pricing page](https://ai.google.dev/gemini-api/docs/pricing); free-tier limits are not published there (see them in AI Studio) and are not guaranteed | Pay per use, no free tier confirmed |
| Privacy | On the free tier Google states the content is **used to improve its products** | Per Anthropic's terms |
| Quality | Not tested with a real key. The server validates every response against the schema and retries once if it is malformed | Schema-constrained structured outputs |
| Key | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | [Anthropic Console](https://platform.claude.com/) |
| Env var | `GEMINI_API_KEY` | `ANTHROPIC_API_KEY` |

A Google AI Pro subscription does **not** give API quota: the API is billed and limited separately from the Gemini app.

1. Create the API key for your provider.
2. Pick a long random string as `RECIPE_IMPORT_PASSCODE`.
3. Locally: put them in `.env.local` (see `.env.example`). On Vercel: add the same names under
   *Project → Settings → Environment Variables*, then **redeploy** (variables only apply to new deployments).
4. The first time you use an AI page on a device, the app asks for the passcode and remembers it on that device.

Which provider runs: `AI_PROVIDER=gemini|anthropic` if set; otherwise Anthropic when `ANTHROPIC_API_KEY` exists, else Gemini.
Models: Gemini tries `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, then `gemini-2.5-flash` and
`gemini-2.5-flash-lite` (all listed as free on Google's pricing table; Google says the 2.5 models may be limited to keys that used
them before, in which case they are skipped). When a model is overloaded (503) it is retried once, and when it is overloaded, over quota (429) or unknown to your key
(404) the next one is tried. Set `GEMINI_MODEL` to one ID or a comma-separated list to change this. Claude uses
`claude-opus-5-5` (override with `RECIPE_IMPORT_MODEL`).

**"Gemini is overloaded right now" (HTTP 503):** the free tier has no capacity guarantee, so this happens at busy times. The app
already retries and falls back across models; if all of them are busy, wait a minute and try again.

**Why a passcode:** the function is a public URL that spends your quota or credits. Without the passcode, anyone who finds the
URL could use it up. The passcode is compared in constant time and is never sent to the AI provider.

**Quota and cost:** on Gemini's free tier, when you hit the limit the app shows "free-tier quota reached" (HTTP 429); wait and
retry. On Claude, Ask AI costs more per use than an import (medium vs low effort, and every "ask for changes" is another
request); check Anthropic's pricing page and set a spend limit in the Console.

### Ask AI: what to know

- The model writes recipes from general knowledge. They are **not tested**, and the app labels them so. Check quantities, times
  and especially food-safety temperatures. The model is told to respect allergies you state, but verify ingredient labels yourself.
- "Ask for changes" resends the current recipe plus your instruction; there is no long chat memory.
- Requests that are not about cooking return a friendly "not a cooking request" message.

### Import from a video (no caption needed)

On `/import`, choose a video file. The AI (Gemini) watches the video and listens to the audio, so ingredients that are only
said out loud are picked up. You then review the recipe in the editor before saving.

**Getting the video:** TikTok and Instagram do not let apps download a video from a link (Instagram requires login; TikTok's
public embed endpoint does not expose the video), and automated downloading is against their terms, so this app does not try.
Save it yourself first: on TikTok use *Share → Save video*; on Instagram or anywhere else, screen-record it **with sound**.

**How it works:** the browser sends the file in 1 MiB chunks (small on purpose, so a weak mobile connection only loses a little) to `/api/video-chunk`, which forwards them to Google's resumable
Files API (Vercel limits a request body to 4.5 MB, and your API key never reaches the browser; a dropped chunk is retried automatically, and a failure says which part failed and why). `/api/video-extract` waits for
Google to process the video, asks Gemini to extract the recipe with the same model fallback as the text features, and **deletes
the file** afterwards (Google also removes uploads after 48 hours). Upload sessions are signed by the server, so the browser cannot
point it at another URL.

**Limits:** up to 100 MB and 5 minutes per video; formats MP4, MOV, WebM, 3GP, MPEG, AVI. Video always uses **Gemini**, even if
`AI_PROVIDER=anthropic`, so `GEMINI_API_KEY` is required (Claude has no video input here). A minute of video is roughly 6,000 to
18,000 tokens according to Google's docs, so it uses free-tier quota much faster than text. On the free tier Google may use
submitted content to improve its products: do not upload videos you would not want to share.

### Import from a caption

Paste the caption text on `/import`. The browser posts it to `/api/extract`, a Vercel function that asks the AI for a structured
recipe, then opens the normal editor pre-filled so you can **review and fix it before saving**. The link, if you add one, is
stored on the recipe as its source. The app tries TikTok's public oEmbed endpoint to prefill the caption; it can return nothing
(private, removed, or short links).

Limits:

- **Instagram:** no automatic reading of a post. Instagram's oEmbed needs a Meta app token and the public page requires login.
- **A caption alone can miss the recipe** when the ingredients are only spoken in the video. Upload the video instead.
- **AI can be wrong.** It is told not to invent quantities, but always compare against the video.
- Importing needs an internet connection. Everything else still works offline.
- Captions and videos are untrusted input: captions are wrapped in delimiters and the model is told to treat everything as data.
  The output is only structured fields that you review, and saved links must be `http(s)`.

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
api/*.ts                   Vercel function entries (extract, generate, video-start, video-chunk, video-extract)
server/                    shared auth + provider selection, Gemini/Anthropic providers, prompts for extract and generate
  hooks/                   data context, object-URL helpers
  components/, pages/      small typed React components and routes
  styles/                  tokens.css, base.css, components.css (plain CSS)
```

Photos are stored as Blobs in their own store, so listing recipes never loads image data.
Checklist state is stored on the recipe (`checked` = ingredient IDs).

**Swapping to Supabase later:** implement the `RecipeStore` interface (`src/storage/recipeStore.ts`) and change the one
assignment at the bottom of that file. The UI imports nothing else from the storage layer except the backup helpers,
which use `exportSnapshot()` / `importSnapshot()` from the same interface.
