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
- `server/` — Express.js backend, single-file monolith (`server/index.js`, ~140KB)
- `db/` — PostgreSQL schema (`schema.sql`) and seed (`seed.sql`)

**Deployment (production, as actually run):**
- Client → **Vercel**, auto-deploys on `git push origin main` → https://onejobs-crm.vercel.app
- Server → **Contabo VPS** behind nginx, PM2 process `onejobs-api` → https://onejobs-crm.duckdns.org
  (`render.yaml` is legacy and no longer the live target.)

Server deploy is a manual pull on the VPS:

```bash
curl -o /var/www/onejobs-crm/server/index.js https://raw.githubusercontent.com/AsadullohR/onejobs-crm/main/server/index.js && pm2 restart onejobs-api
```

DB shell on the VPS:

```bash
psql "$(grep -oP '^DATABASE_URL=\K.*' /var/www/onejobs-crm/server/.env)"
```

---

### Frontend (`client/src/`)

**No router** — navigation is a `page` state string in `App.jsx`. All pages render conditionally in one component tree.

Key files:
- `App.jsx` — root component: holds all global state (leads, tasks, txns, team, config, user), loads all data on login, polls every 30s for new leads
- `api.js` — all API calls; JWT stored in `localStorage` as `onejobs_token`
- `constants.js` — lead `STAGES` array (Uzbek labels), `DONE`/`LOST` status sets, `INIT_ROLES`, `INIT_CFG` (default dropdown values), plus the **shared finance classifiers** below
- `theme.js` — theme context (`ThemeCtx`), dark/light tokens
- `helpers.jsx` — shared UI primitives (`Modal`, `Pill`, `Av`, `inp`, `lab`, `I` icons, date formatters)
- `i18n.jsx` — language context supporting `uz`/`ru`/`en`; all sidebar/nav labels use `t('key')`

**Data flow pattern:** All data loads in a single `Promise.all` in `App.jsx:loadAll()`. Child components receive data as props; mutations call API then update parent state via setter props (e.g. `setLeads`). There is no global store.

**`mapLead()`** (`App.jsx:131`) — converts DB snake_case rows to client camelCase objects. Always use this when receiving lead data from the server.

**Partner visibility:** `partner` role users only see leads where they are an owner or the source matches their name. This filter is applied in `App.jsx` before passing `visibleLeads` to child pages.

**Config whitelist:** `App.jsx` has a `cfgKeys` array listing every config key loaded from the server. A key that isn't in it is silently dropped on reload — **add new config keys there or they will not persist.** Current keys: `countries`, `sectors`, `sources`, `positions`, `txnInc`, `txnExp`, `checklistItems`, `visas`, `staleRules`, `education`, `attendanceCfg`.

**Pages (all conditional on `page` state, all registered in `Sidebar.jsx` NAV + `i18n.jsx`):**
Pipeline, Clients, Finance (`Finance.jsx`), FinanceHub, SalaryPage, Vacancies, Tasks, Team, Settings, EmployerPortal, PartnerPortal, plus:
- `Attendance.jsx` — **Davomat** (nav key `attendance`, admin group). Check-in/out log with anti-cheat flags: `late`, `off_network`, `multi_ip`, `multi_device`, `new_device`, `off_site`, `no_location`, `no_checkout`. Admin configures office IPs and office GPS coordinates + radius via the `attendanceCfg` config key.
- `Education.jsx` + `educationContent.js` — **Ta'lim** (nav key `education`, info group). Seven admin-editable onboarding topics stored under the `education` config key; `educationContent.js` holds the default seed content.

---

### Finance model (get this right before touching money code)

Three different totals, deliberately different:

| Figure | Definition |
|---|---|
| **Kirim / Chiqim / Balans** | Every income / expense row, no filter. `Balans = Kirim − Chiqim`. |
| **Tasdiqlangan** | Confirmed income only (payments actually verified). |
| **Sof Foyda** | `Tasdiqlangan + external income booked to profit − expenses paid from profit`. |

Every transaction and external row carries two independent axes:
- `payment_method` — `cash` (Naqd) or `bank` (Bank)
- `source` — `balance` (Umumiy balans) or `confirmed` (Tasdiqlangan / Sof foyda). This decides **which pot** the row moves.

Shared classifiers in `constants.js` — use these, never re-derive per screen:

```js
isConfirmedSpend(r)  // expense paid out of Sof Foyda
isPayrollTxn(t)      // a salary/bonus/KPI/fine payment, not a client transaction
SALARY_CATS          // ["Oylik maosh","Maosh","Avans","Bonus","KPI","Jarima","Boshqa"]
```

`isPayrollTxn` treats `"Boshqa"` as payroll **only** when the row has an `emp_id`/`emp_name`; otherwise "Boshqa" is a general expense. Dashboard, Finance, FinanceHub and SalaryPage must all agree — they drifted apart repeatedly before these were centralized.

The **external ledger** (`external_expenses`) now holds **both** income and expense rows, discriminated by a `type` column. It is a shared-state list owned by `App.jsx` (`extExps` / `setExtExps`) — child components must write through the setter props, never hold private copies, or general balance stops moving.

---

### Backend (`server/index.js`)

Single Express file. All routes, middleware, and DB logic in one place.

**Auth:** JWT via `Authorization: Bearer <token>`. `auth` middleware attaches `req.user`. `adminOnly` restricts to `admin`/`manager` roles.

**Lead IDs:** Format `NO-{number}`, generated via PostgreSQL sequence `leads_id_seq` using `nextLeadId()`.

**Roles:** `admin`, `manager`, `sales`, `docs`, `hujjatchi`, `partner`, `employer`, `finance_manager`

**Public endpoint:** `GET /api/track/:id` — no auth, returns minimal lead info for public applicant status tracking (accessed via `?track=LEAD_ID` URL param).

**Type parsers (top of the file — do not remove):**

```js
pg.types.setTypeParser(1114, v => v); // TIMESTAMP  → raw string
pg.types.setTypeParser(1184, v => v); // TIMESTAMPTZ → raw string
pg.types.setTypeParser(1082, v => v); // DATE       → raw string
```

Without the DATE override, node-postgres builds a local-midnight `Date`, which serializes to the **previous day** in UTC — and the drift compounds on every save. Dates are handled as `YYYY-MM-DD` strings end to end.

**`app.set("trust proxy", true)`** is required — behind nginx, `req.ip` is otherwise always `127.0.0.1`, which breaks attendance IP checks.

**Attendance helpers:**
- `clientIp(req)` / `deviceHash(req)` — device identity comes from the `X-Device-Id` header (set by `api.js`), falling back to a hash of the user agent
- `registerDevice(userId, req)` — upserts into `user_devices`, using `RETURNING (xmax = 0) AS is_new` to detect a first-time device
- `touchAttendance(userId, req, isLogin, newDevice)` — called on login and on the heartbeat/checkout
- `distanceM(lat1, lng1, lat2, lng2)` — haversine, for the office-radius check
- `APP_TZ` (default `Asia/Tashkent`) governs which work day a check-in lands on

**Admin-gated config keys:** `PUT /api/config/:key` rejects non-admins for `bonusCfg`, `education`, `attendanceCfg`.

**Vacancy fill counting** uses two named status sets near the vacancy routes — `FILLED_STATUSES` (everything from `approved_final` through `visa_received`/`hired`) and `APPROVED_STATUSES`. When candidate statuses change, update these or fill counts silently read zero.

---

### Database (`db/schema.sql`)

Key tables and relationships:
- `leads` — core entity. Triple ownership: `owner_sales`, `owner_consult`, `owner_docs` (all FK to `users`). Payment booleans: `q1/q2/q3/xba`. Finance cached: `total_income`, `total_expense`, `net_balance` (auto-recalculated by trigger on `transactions`).
- `transactions` — income/expense records. DB trigger `txn_after_insert` auto-updates the parent lead's balance columns after any insert/update/delete.
- `tasks` — assignee + optional `lead_id` link
- `config` — key/value JSONB store for dropdown options (countries, sectors, sources, etc.), persisted per-config-key via `PUT /api/config/:key`
- `notifications` — per-user, with `read` flag; polled by the frontend
- `vacancies` / `candidates` — job postings and applicants
- `external_expenses` — overhead rows not tied to a specific lead. `type` (`expense` | `income`), `payment_method`, `source`.
- `attendance` — one row per user per work day. `UNIQUE(user_id, work_date)`. Columns: `check_in`, `check_out`, `last_seen`, `ips` JSONB, `devices` JSONB, `logins`, `new_device`, `in_lat`/`in_lng`/`in_acc`, `out_lat`/`out_lng`, `last_lat`/`last_lng`.
- `user_devices` — known devices per user. `UNIQUE(user_id, device_id)`, with `user_agent`, `first_seen`, `last_seen`, `logins`.

Columns added on top of the base schema (all created by the auto-migration block):
- `transactions.emp_id`, `transactions.emp_name` — attribute a payroll payment to a team member
- `transactions.source` — `balance` | `confirmed`
- `external_expenses.type`, `.payment_method`, `.source`
- `leads.visa_date` — visa received date (client field `vizaSana`)

**Schema evolution:** `schema.sql` is the base, but live migrations run **idempotently on boot** — inside the `app.listen` callback in `server/index.js` there is a block of `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` statements. Add new columns *there* as well as in `schema.sql`, so a `pm2 restart` applies them without a manual psql step.

---

### Role Permission System

Permissions are stored in `INIT_ROLES` (constants.js) and synced to the `config` table as the `roles` key. Each role object has boolean flags like `canFin`, `canEdit`, `canTeam`, `seeAll`, `canChangeOwner`. The `perm` object in `App.jsx` (line 526) drives UI visibility.

Page access per role is enforced in both `Sidebar.jsx` (nav visibility) and `App.jsx` (conditional rendering). Partners and employers are pinned to their own page via the `FORCED_PAGE` map (`App.jsx:529`), which overrides `pageRaw` before render.

---

## Gotchas

Each of these caused a real, shipped bug. Check them before writing similar code.

1. **NUMERIC comes back as a `string`.** node-postgres does not coerce it. Spreading an API response straight into state makes `reduce` concatenate instead of add (this produced a sextillion-scale balance once). Always `Number(x) || 0` at the state boundary, and defensively inside finance reducers.
2. **DATE columns must stay strings** — see the type-parser note above. Never `new Date(dateCol).toISOString()`.
3. **The leads upsert assigns, it does not COALESCE.** Any field absent from the PUT body is written as `NULL`. Partial saves (status changes, bulk actions) must go through `leadSavePayload()` in `Finance.jsx`, which maps the client names to the server's (`lastCall→lastContact`, `shartnomaSana→contractDate`, `officeSuhbat→interviewDate`, `suhbatBelgilangan→interviewScheduled`, `vizaSana→visaDate`). Skipping it silently wipes client dates.
4. **POST/PUT responses are raw snake_case**; list views render camelCase projections. Prefer re-fetching the list after a create over hand-mapping the response — a hand-mapped row renders as "–".
5. **Candidate statuses must pass through `normCandStatus`**, which maps legacy aliases onto the current enum. Any screen reading `candidate.status` directly will show wrong or blank states.
6. **On an UPDATE, don't reuse the INSERT's default.** e.g. sending `source ?? 'balance'` in a PUT resets the column on every edit; the update path must send `null` and `COALESCE` server-side.
7. **New config key ⇒ add it to `cfgKeys` in `App.jsx`** (see Config whitelist above), *and* to the admin gate list if it's admin-only.
8. **Shared ledgers live in `App.jsx`.** Components that keep a private `useState` copy of transactions or external rows will render correctly and still fail to move the global totals.
