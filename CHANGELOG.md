# Changelog — cost-accounting

## [Waves 4–7] 2026-04-21 — Close Workflow + Full UI + Export + Tests (SPEC-COST-001 complete)

### Added

**T7 — Monthly Close Workflow**
- `lib/close/workflow.ts` — `runClose(periodId)`: allocation + transfer entries in one `prisma.$transaction`; Period state machine (OPEN → CLOSED)
- `app/close/page.tsx` — Period selector, run button, close history (last 10 runs)
- `app/close/actions.ts` — Server actions: `closeAction()`, `getCloseHistory()`
- Tests: `tests/unit/close/workflow.test.ts`, `tests/integration/close-workflow.test.ts`

**T8 — Layout, Demo Mode, Persona**
- `app/layout.tsx` — Adds `PersonaProvider` wrapper and sticky `DemoBanner`
- `app/page.tsx` — Persona-aware navigation hub (4 role views)
- `app/(demo)/page.tsx` — Persona picker landing page
- `lib/persona.tsx` — `PersonaProvider` + `usePersona` hook (localStorage, 4 roles: Executive / Controller / PM / Cost Accountant)
- `lib/audit.ts` — `logAudit()` writes `AuditLog` rows for all master data mutations
- `components/demo/DemoBanner.tsx` — Sticky top banner with persona label
- `components/demo/PersonaSwitcher.tsx` — Dropdown persona switcher

**T9 — Dashboards**
- `app/dashboard/enterprise/page.tsx` — Enterprise consolidated P&L with HQ breakdown
- `app/dashboard/hq/[id]/page.tsx` — HQ cost drilldown (direct + allocated + transfer)
- `app/dashboard/project/[id]/page.tsx` — Project budget vs actual vs standard, personnel list
- `app/dashboard/personnel/[id]/page.tsx` — Personnel utilization and cost entries
- `app/dashboard/variance/page.tsx` — Variance factor analysis (four-way decomposition chart)
- `components/charts/VarianceBarChart.tsx` — Recharts four-way variance bar chart

**T10 — Master Data UI**
- `app/(master)/layout.tsx` — Nav sidebar for all master data modules
- `app/(master)/cost-entries/page.tsx` + `actions.ts` — CostEntry list + CRUD server actions
- `app/(master)/organizations/page.tsx` — Organization hierarchy browser
- `app/(master)/personnel/page.tsx`, `projects/page.tsx`, `standard-rates/page.tsx`, `transfer-markups/page.tsx`

**T11 — Export + Polish**
- `lib/export/csv.ts` — CSV serializer (papaparse, browser-only)
- `lib/export/xlsx.ts` — Excel serializer (SheetJS)
- `components/export/ExportButton.tsx` — Download button (CSV / Excel format toggle)
- Tests: `tests/unit/export/csv.test.ts`
- `lib/prisma.ts` — Singleton `PrismaClient` (dev hot-reload safe)

**T12 — Performance + Smoke Tests**
- `tests/integration/allocation-perf.test.ts` — Allocation throughput benchmark (full dataset)
- `tests/integration/allocation-determinism.test.ts`, `reconciliation.test.ts`
- `tests/e2e/smoke.spec.ts`, `demo-banner.spec.ts`, `drill-enterprise-to-personnel.spec.ts`
- `tests/unit/audit/audit.test.ts`
- Coverage: 92% unit (178+ tests); DB-dependent modules excluded per `vitest.config.ts`

### @AX Lifecycle

- Added `@AX:CYCLE:1` to 4 open `@AX:TODO` tags (first sync cycle)
- All ANCHOR fan_in counts verified (min 3 callers each)

---

## [Wave 3] 2026-04-21 — Allocation + Transfer + Variance Engines (SPEC-COST-001)

### Added

**T4 — Allocation Engine (TDD)**
- `lib/allocation/decimal.ts` — Decimal config (precision=28, MONEY_SCALE=4), `conservativeAdd` guaranteeing `sum(allocated) === pool` exactly, `Money` subclass, double-patch guard on `Decimal.prototype.plus`
- `lib/allocation/direct.ts` — Direct allocation pure function: equal, weighted (headcount/hours/cost), zero-pool and single-project edge cases, rounding residual absorbed in last bucket
- `lib/allocation/stepDown.ts` — Step-down allocation: configured sequence, no-feedback invariant, multi-service case
- `lib/allocation/checksum.ts` — SHA-256 input/output checksums; canonical sort `(fromPoolOrgId, toProjectId)`; stored in `AllocationRun`
- `lib/allocation/runner.ts` — Orchestrator composing direct + stepDown inside a single `prisma.$transaction`
- `lib/allocation/runner.queries.ts` — DB query helpers (N+1 pattern tagged `@AX:WARN`)
- Tests: `decimal.test.ts`, `checksum.test.ts`, `direct.test.ts`, `direct-edge.test.ts`, `stepDown.test.ts`, `stepDown-edge.test.ts`

**T5 — Transfer Pricing Engine (TDD)**
- `lib/transfer/rate.ts` — Effective markup resolution by `(fromHqId, toHqId)` pair; throws on missing config (REQ-TP-03 fail-loud)
- `lib/transfer/engine.ts` — Pure function: `CostEntry[] × TransferMarkupRecord[] → TransferEntry[]`; same-HQ no-transfer; cross-HQ credit/charge pairs are symmetric
- Tests: `engine.test.ts`

**T6 — Variance Decomposition (TDD)**
- `lib/variance/decompose.ts` — Kaplan/Atkinson four-way decomposition (price, volume, mix, efficiency)
- `lib/variance/reconcile.ts` — Asserts `totalVariance === sum(effects)` within 0.1% tolerance
- Tests: `decompose.test.ts`, `reconcile.test.ts`

### Changed

- `vitest.config.ts` — Added `coverage.exclude` for DB-dependent modules (`runner.ts`, `runner.queries.ts`, `rate.ts`)
- `lib/allocation/decimal.ts` — Added `__moneyPatched` guard to prevent double-patching on repeated imports

### Annotations

Applied `@AX:ANCHOR`, `@AX:WARN`, `@AX:NOTE` tags to all Wave 3 engine files.

### Notes

- Wave 4 adds close workflow (T7) and layout + demo mode (T8).

---

## [Wave 2] 2026-04-21 — Zod Schemas + Aggregation Engine (SPEC-COST-001)

### Added

**T2 — Zod Schemas**
- `lib/zod/costEntry.ts`, `allocation.ts`, `transfer.ts`, `master.ts`, `period.ts`, `_shared.ts`
- TypeScript types exported via `z.infer`

**T3 — Aggregation Engine**
- `lib/aggregation/personnel.ts`, `project.ts`, `hq.ts`, `enterprise.ts`, `types.ts`
- Pure aggregation functions (sum by grain × periodId)

---

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

---

*Format: Wave N [date] — description (SPEC-ID)*
