# Claude-Projects

Monorepo, one project per top-level folder (see README.md).

## fragrance-content / fragrance-app

`fragrance-app/public/data.json` is the app's *starter data*, generated from the markdown in
`fragrance-content/` (`collection.md`, `wishlist.md`, `content/`, `research/`). Whenever you edit
any of those files, run `node fragrance-app/build.mjs` and commit the updated `data.json` in the
same commit (CI fails otherwise).

The app itself is editable and stores the user's data on their device, so the markdown files can
fall behind. When the user pastes "markdown for Claude" exported from the app (a collection table,
a wishlist table, optional video ideas), treat it as the latest truth: update `collection.md` and
`wishlist.md` to match, then rebuild `data.json`.

### App sync branch (`app-data`)

When GitHub sync is switched on in the app (More tab), every change is committed to an orphan
branch `app-data` of this repo: `app-data.json` (complete data: collection with price, size, bottle
level and so on, wishlist, video ideas, wear log), plus `collection.md` and `wishlist.md` in the same
table format as `fragrance-content/`. Before doing fragrance work (and whenever the user says they
changed something in the app), run `git fetch origin app-data` and read it with
`git show origin/app-data:app-data.json` (and the `.md` files). If it exists, treat it as the latest
truth: update `fragrance-content/collection.md` and `wishlist.md` to match, run
`node fragrance-app/build.mjs`, and commit both. Never push to `app-data` yourself; the app owns it.
Fields that only exist in the app (price, size, wears) stay in `app-data.json`; the markdown tables keep their current columns.

