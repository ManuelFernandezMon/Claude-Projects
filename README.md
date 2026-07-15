# Claude-Projects

A monorepo holding independent projects, one per top-level folder.

## Projects

- [`panama-pets-website/`](panama-pets-website/README.md) — marketing site for the Panama Pets veterinary clinic (React + Vite + TypeScript + Tailwind).

## Adding a new project

1. Create a new top-level folder, kebab-case, named after the project.
2. Keep the project fully self-contained: its own `package.json`/tooling and its own `.gitignore` inside that folder. Don't rely on a shared root `.gitignore` — projects may use different stacks.
3. Add a CI workflow at `.github/workflows/<project-name>-ci.yml`, scoped to that folder with a `paths:` filter (copy the pattern in `panama-pets-website-ci.yml`) so it only runs when that project's files change.
4. If the project deploys, give it its own Vercel project pointed at this repo with **Root Directory** set to the new folder.
5. Link the new project's README from the list above.
