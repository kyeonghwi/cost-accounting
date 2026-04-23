# Cost Accounting — Portfolio Prototype

A Next.js 14 App Router prototype demonstrating cost/management accounting concepts:
job-order costing, overhead allocation, variance analysis, and contribution margin reporting.

---

## For Reviewers

### What to look at

| Area | Location | What it shows |
|------|----------|---------------|
| Allocation engine | `lib/engines/allocation.ts` | Direct + step-down cost pool allocation |
| Variance engine | `lib/engines/variance.ts` | Kaplan/Atkinson four-way variance decomposition |
| API routes | `app/api/` | Next.js Route Handlers with Zod validation |
| Data model | `prisma/schema.prisma` | Cost centers, pools, drivers, jobs |
| UI dashboards | `app/(dashboard)/` | Recharts-based reporting views |

### Architecture overview

```
Browser → Next.js App Router → Route Handlers → Prisma ORM → PostgreSQL
                                                ↓
                                        lib/engines/   (pure TypeScript, framework-free)
```

The allocation and variance engines in `lib/engines/` are intentionally framework-free
so they can be unit-tested without Next.js context. See `docs/allocation-algorithm.md`
and `docs/variance-algorithm.md` for the mathematical specification.

### Where the engines live

- `lib/engines/allocation.ts` — pool-to-object allocation (direct, step-down)
- `lib/engines/variance.ts` — standard-cost variance decomposition
- `lib/engines/contribution.ts` — contribution margin and CVP analysis
- `tests/unit/` — Vitest unit tests for all engine functions

---

## For Accountants (Demo Users)

### How to run locally

```bash
# 1. Install dependencies
pnpm install

# 2. Set up the database (PostgreSQL required — local install or Docker)
pnpm db:migrate
pnpm db:seed

# 3. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo mode

The seed script loads a pre-built dataset representing a two-period manufacturing scenario:
- Two departments (Machining, Assembly) with shared service pools (HR, IT, Facilities)
- Three job orders with standard vs. actual cost tracking
- Monthly variance reports for Period 1 and Period 2

No login is required for the demo. All data resets when you re-run `pnpm db:seed`.

---

## For Developers

### Prerequisites

- Node.js 20+
- pnpm 9+

### Setup

```bash
git clone <repo>
cd cost-accounting
pnpm install
cp .env.example .env.local   # configure DATABASE_URL
pnpm db:migrate
pnpm db:seed
pnpm dev
```

### Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server (http://localhost:3000) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint check |
| `pnpm typecheck` | TypeScript strict check |
| `pnpm test` | Vitest unit tests |
| `pnpm test:coverage` | Unit tests with V8 coverage report |
| `pnpm test:e2e` | Playwright end-to-end tests |
| `pnpm db:migrate` | Apply Prisma migrations |
| `pnpm db:seed` | Load demo data |

### Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v3 + shadcn/ui |
| Database ORM | Prisma 5 |
| Charts | Recharts |
| Validation | Zod |
| Unit tests | Vitest + @vitest/coverage-v8 |
| E2E tests | Playwright |

### Directory map

```
cost-accounting/
├── app/                  # Next.js App Router pages and API routes
│   ├── (dashboard)/      # Dashboard route group
│   ├── api/              # Route Handlers
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Home page
├── components/           # Shared React components
│   └── ui/               # shadcn/ui primitives
├── lib/                  # Framework-free business logic
│   ├── engines/          # Allocation, variance, contribution engines
│   └── utils.ts          # cn() and shared helpers
├── prisma/               # Database schema and seed
│   ├── schema.prisma
│   └── seed.ts
├── tests/
│   ├── unit/             # Vitest unit tests
│   └── e2e/              # Playwright tests
└── docs/
    ├── allocation-algorithm.md
    └── variance-algorithm.md
```

### Contribution notes

- Follow the file size limit: no source file exceeds 300 lines (target under 200)
- All code comments in English
- Run `pnpm typecheck && pnpm lint && pnpm test` before committing
- Commit messages use Lore format (see `.claude/rules/autopus/lore-commit.md`)

---

See `docs/allocation-algorithm.md` and `docs/variance-algorithm.md` for the mathematical
specification of the two core engines.
