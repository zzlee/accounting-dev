# Accounting Dev — Agent Guide

## Project structure

Two independent app variants in one repo:

| Directory | Description |
|---|---|
| `purple-water-b776/` | **Main project** — Cloudflare Worker (D1) backend + React/Vite/PWA frontend |
| `gas-app/` | **Google Apps Script variant** — Google Sheets as database, independent, no npm |
| `data/` | CSVs and SQLite dumps (import/export artifacts) |
| `API.json` | OpenAPI 3.0 spec |

## Commands (main project)

All run from `purple-water-b776/`.

### Backend (Cloudflare Worker)
- `npm run dev` — Start wrangler dev server (`:8787`)
- `npm run deploy` — Deploy to Cloudflare
- `npm run cf-typegen` — Regenerate `worker-configuration.d.ts`
- `npm run test` — Vitest (no tests exist yet)

### Frontend (React/Vite, in `frontend/`)
- `npm run dev` — Vite dev server (proxies `/api` → `localhost:8787`)
- `npm run build` — `tsc -b && vite build` (output: `frontend/dist/`)
- `npm run lint` — ESLint
- `npm run preview` — Vite preview

## Key architecture

- **Backend**: Monolithic `src/index.ts` — simple if/else routing, no framework. D1 binding named `accounting`. CORS added manually to every response.
- **Frontend**: Bootstrap 5, `react-icons` (Fa), `@tanstack/react-table`, `react-datepicker`. Modals lazy-loaded (`React.lazy`). PWA via `vite-plugin-pwa`.
- **DB**: SQLite (Cloudflare D1) — 4 tables: `users`, `transactions`, `item_categories`, `payment_categories`. Migration in `migrations/add_user_id.sql` added `user_id` columns.
- **API routes**: `/api/transactions`, `/api/item-categories`, `/api/payment-categories`, `/api/users`, `/api/database/size` — each with GET/POST/PUT/DELETE as appropriate.
- **Auth / multi-user**: `user-id` query param everywhere. Default is `1` (from `DEFAULT_USER_ID=1` in backend, `'1'` in frontend).
- **Amount convention**: positive = expense (red `text-danger`), negative = income (green `text-success`).
- **Static assets**: In production wrangler serves `frontend/dist/` (see `wrangler.jsonc` assets). In dev, Vite proxies `/api` to `localhost:8787`.

## Style / tooling

- **Indent**: tabs (`.editorconfig`, Prettier `useTabs`)
- **Prettier**: `printWidth 140`, `singleQuote`, `semi`
- **ESLint**: frontend only (`frontend/eslint.config.js`), extends `tseslint.recommended` + `react-hooks` + `react-refresh`
- **CI**: none found

## Testing

- Vitest with `@cloudflare/vitest-pool-workers` configured but **no test files exist**
- Run: `npm run test` from `purple-water-b776/`

## GAS app (separate)

Independent deployment — no npm. Manual setup: create Google Sheet → Apps Script editor → paste `Code.gs`, `Index.html`, `JavaScript.html` → run `setupDatabase()` → deploy as Web App.
