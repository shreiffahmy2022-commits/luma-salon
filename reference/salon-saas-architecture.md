# Salon SaaS — Architecture & Roadmap

Goal: a multi-tenant salon management SaaS in the style of WAJ (bookings, CRM, POS, staff, payroll, and later online booking, WhatsApp, multi-branch, mobile apps).

## 1. Recommended tech stack

The stack below is boring on purpose — proven, cheap to run, easy to hire for.

- Frontend: **Next.js (React + TypeScript)** with Tailwind CSS. One codebase serves the admin dashboard and, later, each salon's public booking page (`{salon}.yourapp.com`).
- Backend: **Next.js API routes or NestJS** (TypeScript). Keep business logic in a service layer so a future mobile app reuses it.
- Database: **PostgreSQL** (managed: Supabase, Neon, or RDS) with **Prisma** ORM.
- Auth: Supabase Auth or Auth.js — email/password + OTP; roles: owner, manager, receptionist, staff.
- Payments: **Stripe** for SaaS subscriptions; local gateways (Paymob, Tap, PayTabs, Telr) for salon customer payments in MENA.
- Messaging: **WhatsApp Business Cloud API** for confirmations/reminders (the single highest-value integration in this market — WAJ leads with it).
- Hosting: Vercel (app) + managed Postgres. Move to containers only when needed.
- Mobile (phase 3): React Native/Expo, reusing the same API.

## 2. Multi-tenancy

Use **one database, shared schema, with a `tenant_id` (salon org) column on every table**, enforced by Postgres Row-Level Security. This is the standard SaaS pattern — cheap, scales to thousands of salons, and RLS gives hard isolation. Each org can own multiple **branches** (locations); most tables also carry `branch_id`.

## 3. Core data model

```
Org (tenant) ─< Branch ─< Staff ─< StaffSchedule
Org ─< User (login) ─ role, branch access
Org ─< Customer ─< Note
Org ─< ServiceCategory ─< Service (duration, price, buffer)
Branch ─< Appointment (customer, staff, service, start, end, status)
Branch ─< Sale ─< SaleItem (service|product, staff attribution, price, qty)
Branch ─< Product (stock) ─< StockMovement
Staff: base_salary, commission_pct → PayrollRun ─< PayrollLine
Later: Membership, Package, GiftCard, Voucher, Expense
```

Key rules already proven in the prototype: appointment conflict check per staff member; sale items carry `staff_id` so commissions and payroll are computed from sales, not bookings; a completed appointment converts to a sale (checkout flow).

## 4. Phased roadmap

**Phase 1 — Internal MVP (4–8 weeks)**
Port the prototype to Next.js + Postgres: auth, org/branch setup, calendar & bookings, customers, POS + receipts, services, staff, payroll report. Single branch per org. Onboard 2–3 pilot salons free.

**Phase 2 — Become sellable (6–10 weeks)**
Public online booking page per salon (this is the growth engine), WhatsApp confirmations + reminders (cuts no-shows ~50%+), Stripe subscription billing with trial, reports dashboard, inventory with stock deduction, Arabic/RTL localization (critical for MENA).

**Phase 3 — Compete with WAJ (ongoing)**
Multi-branch management, mobile apps (owner app first), memberships/packages/gift cards, loyalty & referrals, payroll runs with payslips, expenses & P&L, Google Reserve integration, marketing tools, AI assistant (summaries, no-show prediction, smart rebooking prompts).

## 5. Business notes

- WAJ's positioning is "0% commission, flat subscription" — match that; salons hate per-booking fees (Fresha's model).
- Pricing reference: ~$30–80/branch/month tiers; free 14-day trial, no card.
- Differentiation openings: deeper WhatsApp automation, better Arabic UX, payroll depth, and serving clinics as a second vertical.
- Compliance: VAT invoices (KSA ZATCA e-invoicing if targeting Saudi), data residency questions from bigger chains.

## 6. What exists today

`salon-mvp.html` — a fully working single-file prototype (no install): dashboard with KPIs and 7-day revenue, staff-column day calendar with booking create/edit/conflict detection, customer CRM with profiles and history, POS with cart/discounts/receipts and stock deduction, staff management, and monthly payroll computed from commission on attributed sales. Data persists in the browser with JSON export/import. Use it to validate flows with a real salon before writing production code.
