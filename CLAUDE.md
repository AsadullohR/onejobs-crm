# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (root + server + client)
npm run install:all

# Run both server and client in dev mode
npm run dev

# Run server only (nodemon, port 3001)
cd server && npm run dev

# Run client only (Vite, port 5173)
cd client && npm run dev

# Initialize the database (schema + seed)
npm run setup:db

# Build client for production
npm run build

# Deploy client to Vercel
npm run deploy:vercel
```

**Environment setup:**
- Copy `.env.example` and create `server/.env` with `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `PORT`
- Create `client/.env` with `VITE_API_URL=http://localhost:3001`

Vite dev server proxies `/api` and `/uploads` to `localhost:3001`, so no CORS issues in development.

## Architecture

**Full-stack monorepo** with three top-level directories:

- `client/` — React 18 + Vite frontend, no routing library
- `server/` — Express.js backend, single-file monolith (`server/index.js`, ~83KB)
- `db/` — PostgreSQL schema (`schema.sql`) and seed (`seed.sql`)

**Deployment:** Client → Vercel; Server → Render.com (see `render.yaml`)

---

### Frontend (`client/src/`)

**No router** — navigation is a `page` state string in `App.jsx`. All pages render conditionally in one component tree.

Key files:
- `App.jsx` — root component: holds all global state (leads, tasks, txns, team, config, user), loads all data on login, polls every 30s for new leads
- `api.js` — all API calls; JWT stored in `localStorage` as `onejobs_token`
- `constants.js` — lead `STAGES` array (Uzbek labels), `DONE`/`LOST` status sets, `INIT_ROLES`, `INIT_CFG` (default dropdown values)
- `theme.js` — theme context (`ThemeCtx`), dark/light tokens
- `helpers.jsx` — shared UI primitives (`Modal`, `Pill`, `Av`, `inp`, `lab`, `I` icons, date formatters)
- `i18n.jsx` — language context supporting `uz`/`ru`/`en`; all sidebar/nav labels use `t('key')`

**Data flow pattern:** All data loads in a single `Promise.all` in `App.jsx:loadAll()`. Child components receive data as props; mutations call API then update parent state via setter props (e.g. `setLeads`). There is no global store.

**`mapLead()`** (`App.jsx:116`) — converts DB snake_case rows to client camelCase objects. Always use this when receiving lead data from the server.

**Partner visibility:** `partner` role users only see leads where they are an owner or the source matches their name. This filter is applied in `App.jsx` before passing `visibleLeads` to child pages.

---

### Backend (`server/index.js`)

Single Express file. All routes, middleware, and DB logic in one place.

**Auth:** JWT via `Authorization: Bearer <token>`. `auth` middleware attaches `req.user`. `adminOnly` restricts to `admin`/`manager` roles.

**Lead IDs:** Format `NO-{number}`, generated via PostgreSQL sequence `leads_id_seq` using `nextLeadId()`.

**Roles:** `admin`, `manager`, `sales`, `docs`, `partner`, `employer`, `finance_manager`

**Public endpoint:** `GET /api/track/:id` — no auth, returns minimal lead info for public applicant status tracking (accessed via `?track=LEAD_ID` URL param).

---

### Database (`db/schema.sql`)

Key tables and relationships:
- `leads` — core entity. Triple ownership: `owner_sales`, `owner_consult`, `owner_docs` (all FK to `users`). Payment booleans: `q1/q2/q3/xba`. Finance cached: `total_income`, `total_expense`, `net_balance` (auto-recalculated by trigger on `transactions`).
- `transactions` — income/expense records. DB trigger `txn_after_insert` auto-updates the parent lead's balance columns after any insert/update/delete.
- `tasks` — assignee + optional `lead_id` link
- `config` — key/value JSONB store for dropdown options (countries, sectors, sources, etc.), persisted per-config-key via `PUT /api/config/:key`
- `notifications` — per-user, with `read` flag; polled by the frontend
- `vacancies` / `candidates` — job postings and applicants
- `external_expenses` — overhead costs not tied to a specific lead

**Schema evolution:** No migrations framework — make changes directly in `schema.sql` and re-run, or write one-off `ALTER TABLE` statements.

---

### Role Permission System

Permissions are stored in `INIT_ROLES` (constants.js) and synced to the `config` table as the `roles` key. Each role object has boolean flags like `canFin`, `canEdit`, `canTeam`, `seeAll`, `canChangeOwner`. The `perm` object in `App.jsx` (line 444) drives UI visibility.

Page access per role is enforced in both `Sidebar.jsx` (nav visibility) and `App.jsx` (conditional rendering). Employers and finance_managers are redirected to their specific pages immediately on login using JWT payload before API resolves (see `App.jsx:305`).
