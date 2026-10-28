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
