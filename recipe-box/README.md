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

**How it works:** `/api/video-start` (which holds your Gemini key) opens a resumable upload at Google and returns the session URL
and the chunk size Google requires. The browser then uploads **straight to Google** in chunks of that size (8 MiB multiples,
as the official SDK does). It cannot go through a Vercel function: request bodies are limited to 4.5 MB there. Google's upload
endpoint answers CORS preflights for browser origins (checked), and the session URL carries an upload id, not your API key (the
server strips any `key=` parameter and refuses to continue if the key were still visible). A dropped connection is retried up to
4 times, a Google 4xx is not retried, and a failure shows which part failed and why. Google's reply to the **final** chunk may
not be readable from a browser (a device test failed exactly on the last part), even though the upload succeeded, so each upload
gets a unique display name and `/api/video-find` lets the server (no CORS there) look the file up by it before the app decides
the last chunk was lost. `/api/video-extract` then waits for Google to
process the video, asks Gemini to extract the recipe with the same model fallback as the text features, and **deletes the file**
afterwards (Google also removes uploads after 48 hours). `video-extract` is allowed to run up to **300 s** (`vercel.json`; Vercel's
Hobby plan allows that with Fluid compute) because an overloaded model can take 10 to 40 s just to answer 503: it tries each model
once, then walks the chain a second time. If every model is busy the video is **kept** on Google, the page offers *Try again*
(no second upload) and *Discard upload*, and choosing another video discards the kept one.

**Android picker quirk:** the page has two buttons. *Choose video* opens your Files app; *From Photos* opens Android's photo
picker. Chrome only opens the photo picker when every accepted type is an image or video, and that picker's temporary file
permission can lapse, which shows up as `NotReadableError` ("the requested file could not be read"). *Choose video* therefore
also accepts `application/octet-stream` to get the normal file chooser. In either case the whole file is read into memory the
moment it is chosen and the upload works from that copy (so the browser needs about as much free memory as the video size).

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

## Look and feel

Minimal frosted-glass design: translucent surfaces with a blurred, lit edge over a soft amber and slate backdrop, one amber
accent, rounded shapes (containers 22px, controls 14px, buttons and chips fully round). It follows the system light or dark
setting. Everything is plain CSS driven by tokens in `src/styles/tokens.css`; there is a solid-fill fallback for
`prefers-reduced-transparency`, and animations stop under `prefers-reduced-motion`. Text and control-border contrast was
measured on the rendered pixels (glass over the backdrop) in both themes, not just computed from the tokens.

## Where the data lives, and its limits

**Your data exists only in the browser profile you used to create it.** There is no sync and no server copy.

- Clearing site data, uninstalling the browser, a private window, or a different browser/device means an **empty** app.
- The app calls `navigator.storage.persist()` at startup to make eviction less likely, but browsers may refuse
  (the Backup page shows whether it was granted). It is a mitigation, not a guarantee.
- Different origins do not share data: `localhost`, a Vercel preview URL and your production URL are separate databases.
- **Back up regularly** from the Backup page. Backup files embed photos, so they can be several MB.
- The font (Geist) is bundled with the app, so the interface looks the same offline.

Merge semantics on import: items with the same ID are overwritten by the backup (an imported recipe also replaces its
photos); everything else is kept. Replace erases all current data first.

## Android app

The same code also ships as an installable Android app (Capacitor 8: the web bundle runs inside the system WebView, with
its own icon, full-screen, no browser bar). It is **not** a Play Store app: you install the `.apk` yourself.

- **Install:** open the site in Chrome on the phone, Backup page → "Download Android app", open the file and allow the
  install. The file lives at `/downloads/recipe-box.apk`.
- **Data is separate from the browser.** The app has its own storage. To move recipes: Export in the browser, Import in the app.
  Uninstalling the app or clearing its storage deletes its recipes, so keep exporting backups. In the app, Export opens
  Android's share sheet (save to Drive/Files, email) because a WebView cannot download blob files.
- **The AI features still need the internet.** The app has no server of its own: it calls the deployed site's `/api/*`
  endpoints (address in `.env.android`, `VITE_API_BASE`). The server allows those calls from the app's origin
  (`https://localhost`) and nothing else (`CORS_ALLOWED_ORIGINS` adds more, for tests). If you move the site to another
  domain, edit `.env.android` and rebuild the APK.
- **Updating:** the app does not update itself. Build a new APK and install it over the old one (recipes are kept).

### Building the APK

Needs JDK 17+, the Android SDK (`ANDROID_HOME`, platform `android-36` and build-tools) and network access for Gradle.

```bash
ANDROID_HOME=/path/to/sdk npm run apk     # -> public/downloads/recipe-box.apk, then commit and deploy
```

The first run creates a signing key in `android/keystore/` (+ `android/keystore.properties`). Both are git-ignored on
purpose, because this repository is public. **Back them up.** Android only installs an update over an existing install
when the signing key is the same; with a new key you must uninstall first, and uninstalling deletes the app's recipes
(export a backup first).

## Architecture

```
src/
  types.ts                 data model
  storage/
    recipeStore.ts         RecipeStore interface + the exported singleton the UI uses
    idbRecipeStore.ts      IndexedDB implementation (stores: recipes, categories, images, meta)
    seed.ts, backup.ts     sample data; JSON export/import + validation
api/*.ts                   Vercel function entries (extract, generate, video-start, video-find, video-extract)
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
