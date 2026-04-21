# Changelog — cost-accounting

## [Wave 1] 2026-04-21 — Bootstrap + Prisma Schema (SPEC-COST-001)

### Added

**T0 — Project Bootstrap**
- Next.js 14 App Router project with TypeScript strict mode (pnpm)
- ESLint (next/core-web-vitals + typescript + prettier), Prettier config
- Tailwind CSS v3 + shadcn/ui base (`components.json`, `lib/utils.ts`)
- Vitest (unit tests, coverage scoped to `lib/`), Playwright (E2E, port 3000)
- `app/layout.tsx` (root layout), `app/page.tsx` (placeholder home)
- `README.md` with three where-to-start sections (reviewers / accountants / developers)
- `docs/allocation-algorithm.md` skeleton (T4 fills in algorithm)
- `docs/variance-algorithm.md` skeleton (T6 fills in Kaplan/Atkinson decomposition)
- Vitest smoke test: `tests/unit/utils.test.ts` (3 cases, harness verified)

**T1 — Prisma Schema and Seed**
- `prisma/schema.prisma` — 14 models: Organization, Project, Personnel, CostCategory,
  StandardRate, TransferMarkup, CostEntry, Period, AllocationRule, AllocationRun,
  AllocationResult, TransferEntry, VarianceSnapshot, AuditLog
- All monetary columns: `@db.Decimal(18, 4)` → PostgreSQL `DECIMAL(18,4)`
- `prisma/seed.ts` — dispatches on `SEED_PROFILE` env var (default: small)
- `prisma/seed/small.ts` — 1 HQ, 3 projects, 10 personnel, 1 month (idempotent upserts)
- `prisma/seed/full.ts` — 5 HQs, 20 projects, ~200 personnel, 12 months
- `prisma/migrations/0001_init/migration.sql` — initial migration SQL
- `package.json` db scripts: `db:migrate`, `db:seed`, `db:seed:small`, `db:seed:full`, `db:reset`
- `.env.example` with `DATABASE_URL` placeholder

### Notes
- `pnpm db:seed` defaults to seed:small (1 HQ). Use `db:seed:full` for 5-HQ demo dataset.
- `pnpm prisma migrate dev` requires a live PostgreSQL instance (`DATABASE_URL` in `.env`).
- Wave 2 adds Zod schemas (T2) and aggregation engine (T3).

---

*Format: Wave N [date] — description (SPEC-ID)*
