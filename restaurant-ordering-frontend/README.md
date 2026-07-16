# restaurant-ordering-frontend

Customer ordering UI and a staff order-status screen for "Ember & Herb", built against the
Express + Supabase restaurant ordering API (React + Vite + TypeScript + Tailwind).

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` and point `VITE_API_BASE_URL` at a running instance of the backend, e.g.:

```
VITE_API_BASE_URL=http://localhost:4000/api/v1
```

```bash
npm run dev
```

There is no mock/offline mode — the app expects a real backend at `VITE_API_BASE_URL` and menu
loading, checkout, and status updates will show connection errors without one.

## What's here

- **`/`** — browse the menu (grouped by category), add dishes to a cart (persisted in
  `localStorage`), and open the cart drawer.
- **`/checkout`** — enter name + email and place the order. The cart total shown before checkout
  is an *estimate*: the backend recalculates the authoritative total server-side from current
  menu prices, so the confirmed total may differ slightly.
- **`/order/confirmation`** — shows the most recently placed order (persisted in `localStorage`,
  survives a page refresh).
- **`/staff/orders`** — update an existing order's status by ID. The backend has **no endpoint to
  list or look up orders**, so this screen only works if you already have the order's UUID (e.g.
  copied from the confirmation screen). It has no authentication, since the backend doesn't offer
  any to check against — treat it as an internal, unlisted tool rather than a protected admin
  panel.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) and build for production
- `npm run lint` — oxlint
- `npm run preview` — preview the production build locally
- `npm run format` — format with Prettier
