import { describe, it, expect, vi } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { directAllocate } from '../../lib/allocation/direct'
import { stepDownAllocate } from '../../lib/allocation/stepDown'
import { runAllocation } from '../../lib/allocation/runner'
import type { PrismaClient, AllocationMethod } from '@prisma/client'
import type { DirectTarget } from '../../lib/allocation/direct'
import type { Pool } from '../../lib/allocation/stepDown'

// T12 — Performance: full allocation run on seed:full-scale data completes
// within 3 seconds (REQ-ALLOC, NFR-PERF from PRD).
//
// Two test tiers:
//   1. Engine tier (pure functions): already passing — kept as regression guard.
//   2. Runner tier (runAllocation with seed:full-scale mocked Prisma): wired to
//      match the actual runner.queries.ts API signatures exactly.

// --- Synthetic seed:full-scale data ---

function buildFullScaleTargets(): DirectTarget[] {
  const targets: DirectTarget[] = []
  for (let i = 1; i <= 20; i++) {
    const hcBase = Math.floor(200 / 20)
    const extra = i <= 200 % 20 ? 1 : 0
    targets.push({
      projectId: `proj-${String(i).padStart(3, '0')}`,
      headcount: hcBase + extra,
      directLaborHours: new Decimal(String(8 * (hcBase + extra) * 20)),
      directCost: new Decimal(String(50000 * (hcBase + extra))),
    })
  }
  return targets
}

function buildFullScalePools(): Pool[] {
  const pools: Pool[] = []
  for (let hq = 1; hq <= 5; hq++) {
    for (let p = 1; p <= 4; p++) {
      pools.push({
        orgId: `hq-${hq}-pool-${p}`,
        amount: new Decimal(String(100000 * hq * p)),
      })
    }
  }
  return pools
}

// --- Mocked PrismaClient wired to match actual runner.queries.ts API ---
//
// runner.queries.ts call shapes:
//   loadAllocationRules:   allocationRule.findMany({ orderBy, no-select })
//   loadPoolAmounts:       allocationRule.findMany({ select: { poolOrgId } })
//                          costEntry.aggregate({ _sum: { amount }, where: { periodId, personnel: { homeHqId } } })
//   loadOperatingTargets:  project.findMany({ where: { ownerHq: { kind: 'DEPARTMENT' } }, select: { id, ownerHqId } })
//                          personnel.count({ where: { homeHqId } })
//                          costEntry.aggregate({ _sum: { hours, amount }, where: { projectId, periodId } })

function buildMockPrisma(targets: DirectTarget[], pools: Pool[]): PrismaClient {
  // Map for O(1) lookup of pool amount and target metrics by id.
  const poolByOrgId = new Map(pools.map((p) => [p.orgId, p]))
  const targetByProjectId = new Map(targets.map((t) => [t.projectId, t]))

  // Build rule rows: one rule per pool.
  const ruleRows = pools.map((p, i) => ({
    id: `rule-${i}`,
    poolOrgId: p.orgId,
    allocationKey: 'HEADCOUNT' as const,
    method: 'DIRECT' as AllocationMethod,
    sequence: i + 1,
  }))

  // Project rows for loadOperatingTargets: { id, ownerHqId } only.
  const projectRows = targets.map((t) => ({
    id: t.projectId,
    ownerHqId: `hq-owner-${t.projectId}`,
  }))

  const mockTx = {
    allocationRun: {
      create: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve({
          id: 'run-perf-001',
          createdAt: new Date(),
          ...data,
        }),
      ),
    },
    allocationResult: {
      createMany: vi.fn().mockResolvedValue({ count: targets.length * pools.length }),
    },
  }

  const mockPrisma = {
    // allocationRule.findMany — called twice (loadAllocationRules + loadPoolAmounts)
    allocationRule: {
      findMany: vi.fn().mockResolvedValue(ruleRows),
    },

    // project.findMany — returns { id, ownerHqId } for loadOperatingTargets
    project: {
      findMany: vi.fn().mockResolvedValue(projectRows),
    },

    // personnel.count — called per project; return the target's headcount
    personnel: {
      count: vi.fn().mockImplementation(({ where }: { where: { homeHqId: string } }) => {
        // ownerHqId -> projectId mapping: `hq-owner-proj-NNN` -> `proj-NNN`
        const projectId = where.homeHqId.replace('hq-owner-', '')
        const target = targetByProjectId.get(projectId)
        return Promise.resolve(target?.headcount ?? 0)
      }),
    },

    // costEntry.aggregate — discriminated by presence of where.projectId
    //   pool call:    where.personnel.homeHqId is set   → return _sum.amount
    //   project call: where.projectId is set             → return _sum.{ hours, amount }
    costEntry: {
      aggregate: vi.fn().mockImplementation(
        ({
          where,
        }: {
          where: { projectId?: string; periodId?: string; personnel?: { homeHqId?: string } }
        }) => {
          if (where.projectId) {
            // Per-project cost aggregate for loadOperatingTargets
            const target = targetByProjectId.get(where.projectId)
            return Promise.resolve({
              _sum: {
                hours: target?.directLaborHours ?? new Decimal(0),
                amount: target?.directCost ?? new Decimal(0),
              },
            })
          }
          // Pool cost aggregate for loadPoolAmounts (where.personnel.homeHqId)
          const orgId = where.personnel?.homeHqId ?? ''
          const pool = poolByOrgId.get(orgId)
          return Promise.resolve({
            _sum: {
              amount: pool?.amount ?? new Decimal(0),
              hours: new Decimal(0),
            },
          })
        },
      ),
    },

    $transaction: vi
      .fn()
      .mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)),
    ...mockTx,
  } as unknown as PrismaClient

  return mockPrisma
}

describe('allocation performance — runner tier (T12)', () => {
  const targets = buildFullScaleTargets()
  const pools = buildFullScalePools()
  const BUDGET_MS = 3000

  it('runAllocation resolves with an AllocationRun record containing the periodId', async () => {
    const mockPrisma = buildMockPrisma(targets, pools)
    const run = await runAllocation(mockPrisma, 'period-full-001', 'DIRECT' as AllocationMethod)

    expect(run.periodId).toBe('period-full-001')
    expect(run.id).toBeTruthy()
    expect(run.inputChecksum).toBeTruthy()
    expect(run.outputChecksum).toBeTruthy()
  })

  it('runAllocation on seed:full-scale data completes within 3 seconds', async () => {
    const mockPrisma = buildMockPrisma(targets, pools)

    const start = performance.now()
    const run = await runAllocation(mockPrisma, 'period-full-001', 'DIRECT' as AllocationMethod)
    const elapsed = performance.now() - start

    // Content assertion: run record is valid
    expect(run.periodId).toBe('period-full-001')
    expect(run.runtimeMs).toBeGreaterThanOrEqual(0)

    // Performance assertion: must complete within 3 seconds
    expect(elapsed).toBeLessThan(BUDGET_MS)
  })
})

// --- Engine-tier regression guard (passes today, kept for safety) ---
describe('allocation engine regression guard (pure functions)', () => {
  const targets = buildFullScaleTargets()
  const pools = buildFullScalePools()

  it('directAllocate sum equals pool total for every pool at seed:full scale', () => {
    for (const pool of pools) {
      const results = directAllocate(pool.amount, { allocationKey: 'HEADCOUNT' }, targets)
      const allocated = results.reduce((s, r) => s.plus(r.amount), new Decimal('0'))
      expect(Math.abs(allocated.minus(pool.amount).toNumber())).toBeLessThanOrEqual(0.01)
    }
  })

  it('stepDownAllocate covers all 20 projects at seed:full scale', () => {
    const sequence = pools.map((p) => p.orgId)
    const results = stepDownAllocate(pools, sequence, targets)
    const toProjects = new Set(results.map((r) => r.toProjectId))
    expect(toProjects.size).toBe(targets.length)
  })
})
