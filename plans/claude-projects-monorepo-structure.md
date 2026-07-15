# Structure Claude-Projects as a multi-project monorepo

## Context
The user wants to host multiple independent projects inside the `Claude-Projects` GitHub repo (currently it only holds `panama-pets-website/`). Their original phrasing was "move the project from one folder to another," but after clarifying, what they actually want is a recommended convention for organizing several projects in this one repo going forward — not literally relocating `panama-pets-website`.

Investigation of the current repo confirms the structure is already most of the way there:
- Repo root (`Claude-Projects`) currently contains only `.git`, `.github/workflows/ci.yml`, and `panama-pets-website/` — i.e. it's already "one top-level folder per project," just with a single project in it today.
- There is no root-level README or `.gitignore` — only `panama-pets-website/.gitignore` (a standard Vite-project ignore file plus a couple of project-specific rules).
- The CI workflow added earlier (`.github/workflows/ci.yml`) is scoped via `working-directory: panama-pets-website` but its trigger (`push`/`pull_request` with no path filter) fires on *any* change anywhere in the repo — so once a second project exists, editing it would needlessly re-run panama-pets-website's lint/build.

**Recommendation:** keep the flat, folder-per-project layout that already exists (don't move `panama-pets-website` — it's already correctly placed), and add the conventions that make it scale cleanly to more projects:

1. Each project = one top-level folder, kebab-case, fully self-contained (its own `package.json`/tooling, its own `.gitignore`, its own `README.md`). This matches what `panama-pets-website/` already does.
2. Each project gets its **own CI workflow file** (not one shared workflow), scoped with a `paths:` filter so it only runs when that project's files change.
3. Each project that deploys gets its **own Vercel project** pointed at this repo with **Root Directory** set to that project's folder (this already works today with Vercel — no repo change needed for that part).
4. Add a root-level `README.md` that lists the projects in the repo and documents this convention, so future-you (or future Claude) knows the pattern without rediscovering it.

## Plan

### 1. Scope the existing CI workflow to its project via path filter
Edit `.github/workflows/ci.yml`:
- Rename the file to `.github/workflows/panama-pets-website-ci.yml` (project-specific name, so it's clear at a glance which project each workflow belongs to once more are added).
- Add a `paths:` filter to both `push` and `pull_request` triggers so it only runs on changes under `panama-pets-website/`:
```yaml
name: panama-pets-website CI
on:
  pull_request:
    paths: ['panama-pets-website/**']
  push:
    branches: [main]
    paths: ['panama-pets-website/**']
jobs:
  build:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: panama-pets-website
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: panama-pets-website/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build
```

### 2. Add a root-level README documenting the monorepo convention
Create `README.md` at the repo root (there isn't one currently — only `panama-pets-website/README.md` exists) covering:
- What this repo is (a collection of independent projects, one per top-level folder)
- Current projects list (linking to `panama-pets-website/README.md`)
- The convention for adding a new project:
  - New top-level folder, kebab-case name matching the project
  - Own `package.json`/tooling and own `.gitignore` inside that folder (don't rely on a shared root `.gitignore` — projects may use different stacks)
  - Own CI workflow file in `.github/workflows/<project-name>-ci.yml`, path-filtered to that folder (copy the pattern from `panama-pets-website-ci.yml`)
  - Own Vercel project (if it deploys) with Root Directory set to the new folder

### 3. Commit and push
Commit the renamed/edited workflow and the new root README together, push to `main`.

## Verification
- After pushing, check the GitHub Actions tab: confirm the workflow now shows as `panama-pets-website CI` and still runs on this push (since it touched files under `panama-pets-website/`... note: the workflow rename/path-filter edit itself lives outside that folder, so this particular push won't retrigger it — that's expected and fine, it'll pick up correctly on the next real code change).
- Make a trivial throwaway edit under `panama-pets-website/` (or wait for the next real change) and confirm the workflow fires; confirm it would *not* fire for a change made only under a hypothetical second project folder.
- Visually confirm the root `README.md` renders sensibly on GitHub's repo homepage.

## Outcome (as executed)
Executed exactly as written: `.github/workflows/ci.yml` renamed to `panama-pets-website-ci.yml` with the `paths:` filter added, and a root `README.md` created documenting the monorepo convention. Committed and pushed to `main` in commit `fc2ac8e`.
