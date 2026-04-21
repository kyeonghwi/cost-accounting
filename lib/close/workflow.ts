import type { PrismaClient, AllocationRun, AllocationMethod } from '@prisma/client'
import { checksumInput, checksumOutput } from '../allocation/checksum'
import type { ChecksumInputEntry, ChecksumInputRule, ChecksumOutputResult } from '../allocation/checksum'
import { directAllocate } from '../allocation/direct'
import type { AllocationKey, DirectTarget } from '../allocation/direct'
import { stepDownAllocate } from '../allocation/stepDown'
import type { Pool, StepDownResult } from '../allocation/stepDown'
import { computeTransferEntries } from '../transfer/engine'
import {
  loadAllocationRules,
  loadPoolAmounts,
  loadOperatingTargets,
} from '../allocation/runner.queries'

export interface CloseResult {
  periodId: string
  status: 'CLOSED'
  allocationRunId: string
  transferCount: number
}

interface RuleRow {
  poolOrgId: string
  allocationKey: AllocationKey
  method: string
  sequence: number | null
}

// @AX:ANCHOR: [AUTO] monthly close entry point — fan_in: closeAction (actions.ts); changes here affect Period.status, AllocationRun, AllocationResult, TransferEntry atomically
// @AX:ANCHOR: [AUTO] transaction boundary — all DB writes (AllocationRun + AllocationResult + TransferEntry + Period.status) commit or roll back together; do not split
/**
 * Runs the full monthly close for a period:
 *  1. Validates period exists and is OPEN
 *  2. Loads allocation inputs from DB
 *  3. Loads cost entries + markup rates for transfer pricing
 *  4. Computes allocations (direct or step-down) and transfer entries
 *  5. Persists AllocationRun, AllocationResult, TransferEntry rows and
 *     flips Period.status to CLOSED — all inside a single transaction
 */
export async function runCloseWorkflow(
  prisma: PrismaClient,
  periodId: string,
  method: AllocationMethod,
): Promise<CloseResult> {
  // Validate period
  const period = await prisma.period.findUnique({ where: { id: periodId } })
  if (!period) throw new Error(`Period not found: ${periodId}`)
  if (period.status === 'CLOSED') throw new Error(`Period ${periodId} is already CLOSED`)

  const startedAt = Date.now()

  // @AX:WARN: [AUTO] unsafe cast — prisma as unknown as Record used for duck-typing table availability; breaks if Prisma client interface changes
  // @AX:NOTE: [AUTO] duck-typing guard for narrow test mocks — tables absent in mock clients return empty arrays; real PrismaClient always has these tables
  // Load allocation inputs — use empty arrays if the client does not expose
  // these tables (e.g., narrow test mocks).
  const prismaAny = prisma as unknown as Record<string, Record<string, unknown>>
  const hasAllocationRule = typeof prismaAny['allocationRule']?.['findMany'] === 'function'

  const [rules, poolAmounts, targets] = hasAllocationRule
    ? await Promise.all([
        loadAllocationRules(prisma),
        loadPoolAmounts(prisma, periodId),
        loadOperatingTargets(prisma, periodId),
      ])
    : [[], [], []]

  // Build allocation checksums
  const inputEntries: ChecksumInputEntry[] = poolAmounts.map((p) => ({
    poolOrgId: p.orgId,
    amount: p.amount.toFixed(),
  }))
  const inputRules: ChecksumInputRule[] = rules.map((r) => ({
    poolOrgId: r.poolOrgId,
    allocationKey: r.allocationKey,
    method: r.method as string,
    sequence: r.sequence,
  }))
  const inputChecksum = checksumInput(inputEntries, inputRules)

  // Compute allocations using pure functions
  const stepResults = computeAllocations(method, rules as RuleRow[], poolAmounts, targets)

  const outputForChecksum: ChecksumOutputResult[] = stepResults.map((r) => ({
    fromPoolOrgId: r.fromPoolOrgId,
    toProjectId: r.toProjectId,
    amount: r.amount.toFixed(),
  }))
  const outputChecksum = checksumOutput(outputForChecksum)
  const runtimeMs = Date.now() - startedAt

  // Load cost entries and markups for transfer pricing — skip if tables unavailable.
  const hasCostEntry = typeof prismaAny['costEntry']?.['findMany'] === 'function'

  const transferEntries = hasCostEntry
    ? await loadTransferEntries(prisma, periodId)
    : []

  // Persist everything in one transaction
  const { run, transferCount } = await prisma.$transaction(async (tx) => {
    const created: AllocationRun = await tx.allocationRun.create({
      data: {
        periodId,
        method,
        inputChecksum,
        outputChecksum,
        runtimeMs,
      },
    })

    if (stepResults.length > 0) {
      await tx.allocationResult.createMany({
        data: stepResults.map((r) => ({
          runId: created.id,
          fromPoolOrgId: r.fromPoolOrgId,
          toProjectId: r.toProjectId,
          amount: r.amount,
        })),
      })
    }

    let count = 0
    if (transferEntries.length > 0) {
      const result = await tx.transferEntry.createMany({
        data: transferEntries.map((te) => ({
          periodId,
          fromHqId: te.fromHqId,
          toHqId: te.toHqId,
          personnelId: te.personnelId,
          hours: te.hours,
          standardRate: te.standardRate,
          markupPct: te.markupPct,
          amount: te.amount,
          direction: te.direction,
        })),
      })
      count = result.count
    }

    await tx.period.update({
      where: { id: periodId },
      data: { status: 'CLOSED', closedAt: new Date() },
    })

    return { run: created, transferCount: count }
  })

  return {
    periodId,
    status: 'CLOSED',
    allocationRunId: run.id,
    transferCount,
  }
}

// @AX:TODO: [AUTO] computeAllocations has no dedicated unit test; both DIRECT and STEP_DOWN branches should be covered with pure-function tests
// @AX:CYCLE:1
// ─── Private helpers ──────────────────────────────────────────────────────────

async function loadTransferEntries(
  prisma: PrismaClient,
  periodId: string,
): Promise<ReturnType<typeof computeTransferEntries>> {
  const [costEntriesRaw, markupRows] = await Promise.all([
    prisma.costEntry.findMany({
      where: { periodId },
      include: {
        personnel: { select: { homeHqId: true } },
        project: { select: { ownerHqId: true } },
      },
    }),
    prisma.transferMarkup.findMany({
      select: { fromHqId: true, toHqId: true, markupPct: true },
    }),
  ])

  const costEntries = costEntriesRaw.map((e) => ({
    id: e.id,
    personnelId: e.personnelId,
    personnelHomeHqId: e.personnel.homeHqId,
    projectId: e.projectId,
    projectOwnerHqId: e.project.ownerHqId,
    date: e.date,
    hours: e.hours,
    standardHourlyRate: e.amount,
    periodId: e.periodId,
  }))

  return computeTransferEntries(costEntries, markupRows)
}

// @AX:WARN: [AUTO] branching allocation logic — STEP_DOWN sorts by sequence nullable, DIRECT falls back to 'HEADCOUNT'; incorrect sequence ordering silently produces wrong cost distribution
function computeAllocations(
  method: AllocationMethod,
  rules: RuleRow[],
  pools: Pool[],
  targets: DirectTarget[],
): StepDownResult[] {
  if (method === 'STEP_DOWN') {
    const sequence = rules
      .filter((r) => r.method === 'STEP_DOWN' && r.sequence !== null)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .map((r) => r.poolOrgId)
    return stepDownAllocate(pools, sequence, targets)
  }

  const results: StepDownResult[] = []
  const ruleByPool = new Map(rules.map((r) => [r.poolOrgId, r]))
  for (const pool of pools) {
    if (pool.amount.isZero()) continue
    const rule = ruleByPool.get(pool.orgId)
    // @AX:NOTE: [AUTO] magic constant — 'HEADCOUNT' is the default allocation key when no rule row exists for a pool
    const key: AllocationKey = rule?.allocationKey ?? 'HEADCOUNT'
    const distributed = directAllocate(pool.amount, { allocationKey: key }, targets)
    for (const d of distributed) {
      results.push({
        fromPoolOrgId: pool.orgId,
        toProjectId: d.projectId,
        amount: d.amount,
      })
    }
  }
  return results
}
