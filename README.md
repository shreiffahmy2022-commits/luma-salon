# Luma — Salon SaaS (Next.js + PostgreSQL, multi-tenant)

Production codebase for a WAJ-style salon management platform. Every org (salon)
gets an isolated workspace (multi-tenant by `orgId` on every table) plus a public
online booking page at `/book/<slug>`.

## What's included

| Area | Route | Notes |
|---|---|---|
| Auth | `/login`, `/register` | Registering creates an Org + Main branch + Owner user. JWT session cookie (jose), bcrypt passwords, middleware-guarded app routes. |
| Dashboard | `/dashboard` | Today's revenue, 7-day trend vs prior week, avg ticket, top services, upcoming appointments. |
| Calendar | `/calendar?date=…` | Day view with staff columns; click a slot to book; conflict detection with "book anyway" override; edit/delete/status. |
| Customers | `/customers` | Search, CRUD, visits, lifetime spend, last visit, tags & notes. |
| POS | `/pos` | Services + retail cart, per-line staff attribution, discount %, cash/card/link, receipt, stock decrement. |
| Sales | `/sales` | Transaction log. |
| Staff | `/staff` | CRUD, base salary + commission %, monthly bookings/revenue per member. |
| Payroll | `/payroll?month=…` | Base + commission on attributed sale items, per month. |
| Services | `/services` | Menu CRUD by category. |
| Reports | `/reports?days=…&from=…&to=…` | Analytics: revenue trend, revenue mix (service vs retail), payment methods, top services, staff performance, appointment funnel with no-show/cancel rate. Date-range presets + custom range, scoped to the active branch. |
| Settings | `/settings` | Org name/currency, **branch management** (add/rename), and your booking page link. |
| Public booking | `/book/<slug>` | 4-step wizard: service → professional ("Any" = first available) → real availability slots → details. Dedupes customers by phone, re-validates the slot server-side. Scoped to the org's default branch. |

## Multi-branch & localization

- **Multi-branch**: each org can own multiple **branches** (locations). Add/rename them in Settings; switch the active branch from the sidebar. Branch-owned data — calendar, staff, sales, POS, payroll, reports, dashboard — is scoped to the active branch (persisted in the session). Services, products and the customer list stay **org-wide** (shared catalog & clientele). The active branch is stored in the JWT session, so it survives navigation and reloads.
- **Arabic / RTL**: cookie-based i18n (`en` / `ar`) with no extra dependencies — dictionary + `t()` in `src/lib/i18n.ts`. The language toggle (EN / ع) lives in the sidebar; switching sets `<html lang dir>` and flips the whole layout to RTL via Tailwind logical properties (`ms-`/`me-`/`text-start`/`text-end`). The full admin UI is translated — nav, dashboard, reports, calendar (incl. the booking modal), POS, sales, customers, staff, payroll, services, settings, and login/register. Client components (calendar, POS, auth forms) receive their strings as a `labels` prop built server-side, since `t()` reads the cookie on the server. Org data (service names, categories, staff names) stays as entered. The public booking wizard is intentionally left in English (customers don't carry the admin locale cookie); give the org a default public locale as a follow-up.

### Public booking is branch-aware

When an org has more than one branch, `/book/<slug>` opens with a **"Choose a location"** step; the professional list and availability are scoped to the selected branch, and the booking is written to that branch. Single-branch orgs skip the step and behave as before.

## Run it

Prereqs: Node 20+, and any PostgreSQL 14+ (Docker, native install, or a hosted DB like Neon).

**Quick start** — start a database, then let the bootstrap script do the rest:

```bash
docker compose up -d         # optional: starts PostgreSQL on :5432 if you use Docker
npm install                  # also runs prisma generate
npm run setup                # creates .env (random AUTH_SECRET) + db push + seed demo data
npm run dev                  # http://localhost:3000
```

`npm run setup` is idempotent — safe to re-run. If the database isn't reachable it stops and
tells you how to start one. On Windows this repo uses a portable PostgreSQL on **port 5433**
(see the next section) — start that first, then run `npm run setup`.

<details>
<summary>Manual steps (what <code>npm run setup</code> automates)</summary>

```bash
cp .env.example .env         # set AUTH_SECRET to something random, point DATABASE_URL at your DB
npm run db:push              # creates the schema
npm run db:seed              # demo salon with staff, services, bookings, sales
```
</details>

Demo login: **owner@luma.demo / demo1234** · Demo booking page: **/book/luma**

### This machine's local setup (no Docker)

This environment runs a **portable PostgreSQL 16** cluster (EDB binaries) instead of Docker:

- Binaries: `C:\Users\Shrei\pg16\pgsql\bin` · Data dir: `C:\Users\Shrei\pgdata` · **Port 5433** (5432 is taken by a separately-installed Postgres service).
- `.env` → `DATABASE_URL="postgresql://salon:salon@127.0.0.1:5433/salon?schema=public"`.
- Start the DB (if not running):
  ```bash
  "C:\Users\Shrei\pg16\pgsql\bin\pg_ctl.exe" -D "C:\Users\Shrei\pgdata" -l "C:\Users\Shrei\pgdata\server.log" -o "-p 5433" start
  ```
- Node was installed via `winget install OpenJS.NodeJS.LTS`; if `node`/`npm` aren't on PATH in a fresh shell, refresh it from the registry:
  ```powershell
  $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
  ```

Or register a fresh salon at `/register` — each org's data is fully separate.

## Architecture notes

- **Tenancy**: single DB, shared schema, `orgId` column + app-layer scoping in every
  query (all reads/writes go through the session's `orgId`). Next hardening step:
  Postgres Row-Level Security policies per table (`orgId = current_setting('app.org_id')`).
- **Sessions**: HS256 JWT in an httpOnly cookie; middleware checks presence, server
  code verifies via `requireSession()`.
- **Money**: integers in whole currency units. Switch to minor units (fils/cents)
  before adding card processing.
- **Dates**: appointments store `date` (YYYY-MM-DD) + `startMin`/`durationMin`
  minutes-from-midnight — timezone-simple for single-location salons.
- **Mutations**: Next.js Server Actions (no separate API layer); availability logic
  shared in `src/lib/availability.ts` between admin calendar and public booking.

## Suggested next steps (Phase 2 of the roadmap)

WhatsApp confirmations/reminders (Business Cloud API), Stripe subscription billing,
inventory purchasing, Arabic/RTL, reports, RLS policies, multi-branch UI, rate
limiting on public booking, and e2e tests (Playwright).
