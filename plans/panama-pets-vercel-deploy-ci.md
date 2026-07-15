# Set up deployment/CI for Panama Pets website (Vercel)

## Context
The Panama Pets site is a code-complete pre-launch MVP (React 19 + Vite + TS + Tailwind) with no deployment pipeline yet. The user wants to get it deploying to Vercel with CI in place. Two structural quirks affect how this needs to be done:

- The repo (`ManuelFernandezMon/Claude-Projects`) currently has only one branch, `claude/chat-session-7nt912`, which is also set as the GitHub default branch — not a conventional `main`. The user asked to rename it to `main`.
- The site lives in a `panama-pets-website/` subfolder of the repo, not at the repo root, so Vercel's project needs its "Root Directory" pointed there.

**Environment constraint discovered during investigation:** this machine has no `gh`, `node`, `npm`, or `vercel` CLI on PATH. That means:
- I can't run `npm install`/`npm run build` locally to verify the build.
- I can't use `gh` to flip the GitHub "default branch" setting via API.
- I can't run the Vercel CLI to create/link a Vercel project — connecting a repo to Vercel requires an OAuth browser flow tied to the user's Vercel account, which I can't do on their behalf anyway.

So this plan splits work into (a) repo changes I can make directly, and (b) a short manual checklist for the user to do in the GitHub/Vercel web UIs, which I'll hand them at the end.

## Plan

### 1. Rename the branch to `main`
- `git branch -m claude/chat-session-7nt912 main`
- `git push -u origin main`
- Leave the old `claude/chat-session-7nt912` ref on origin for now (don't force-delete shared remote state without confirming) — mention it to the user as a cleanup they can do once GitHub's default branch is switched over.

### 2. Add SPA routing config for Vercel
Create `panama-pets-website/vercel.json`:
```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```
This is required because `react-router-dom` handles routes like `/services` client-side — without a rewrite, a direct hit or refresh on `/services` would 404 on Vercel's static hosting.

### 3. Add a lightweight CI workflow
Create `.github/workflows/ci.yml` at the **repo root** (not inside `panama-pets-website/`, since GitHub Actions only reads workflows from `.github/workflows` at repo root), scoped to the subfolder:
```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
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
This runs oxlint + the TypeScript/Vite build (`tsc -b && vite build`) on every PR and on pushes to `main`, catching type errors and build breaks before merge. There's no test suite to run yet, so this is the practical CI gate available today.

### 4. Commit and push these repo changes
Commit `vercel.json` and the workflow file, push to `main`.

### 5. Hand the user a manual checklist (can't be automated from here)
After the above is pushed, the user needs to do the following themselves in the web UIs:
- **GitHub**: Settings → Branches → change default branch from the old name to `main`; then optionally delete the old `claude/chat-session-7nt912` branch.
- **Vercel**: Sign in → "Add New Project" → import `ManuelFernandezMon/Claude-Projects` → set **Root Directory** to `panama-pets-website` → framework preset should auto-detect as Vite → add environment variable `VITE_FORMSPREE_ENDPOINT` with the real Formspree form URL (currently a `REPLACE_ME` placeholder, so the contact form won't work until this is set) → Deploy.
- Once linked, every push to `main` auto-deploys to production and every PR gets a preview URL — that's Vercel's built-in CI/CD, no extra config needed beyond the above.

## Verification
- After pushing, confirm the GitHub Actions run (`Actions` tab) passes lint + build on the new `main` branch.
- After the user completes the Vercel project link, visit the generated `*.vercel.app` preview URL and click through all routes (`/`, `/about`, `/services`, `/gallery`, `/testimonials`, `/contact`, and a bogus path to confirm the 404 page) to verify the `vercel.json` rewrite fixes client-side routing on refresh/direct navigation.
- Flag to the user that the contact form will still show an error until the real Formspree endpoint env var is set.

## Outcome (as executed)
Executed largely as written, with two follow-ups after the fact:
- The default branch on GitHub was never switched via `gh` (not available); the branch rename to `main` was done directly with `git branch -m` + `git push -u origin main` in a later session, and the CI workflow was subsequently renamed to `panama-pets-website-ci.yml` with a `paths:` filter as part of the monorepo-structure plan (see `plans/claude-projects-monorepo-structure.md`).
- After the initial Vercel deploy, the site 404'd because the Vercel project's Root Directory hadn't been set to `panama-pets-website` — resolved by setting it in Vercel's project settings and redeploying.
