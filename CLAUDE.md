# Claude-Projects

Monorepo, one project per top-level folder (see README.md).

## fragrance-content / fragrance-app

`fragrance-app/public/data.json` is generated from the markdown in `fragrance-content/`
(`collection.md`, `wishlist.md`, `content/`, `research/`). Whenever you edit any of those
files, run `node fragrance-app/build.mjs` and commit the updated `data.json` in the same commit.
