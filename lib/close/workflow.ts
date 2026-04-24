import type { PrismaClient, AllocationRun, AllocationMethod } from '@prisma/client'
import { checksumInput, checksumOutput } from '../allocation/checksum'
import type { ChecksumInputEntry, ChecksumInputRule, ChecksumOutputResult } from '../allocation/checksum'
import type { DirectTarget } from '../allocation/direct'
import type { Pool } from '../allocation/stepDown'
import { computeAllocations } from '../allocation/compute'
import { computeTransferEntries } from '../transfer/engine'
import {
  loadAllocationRules,
  loadPoolAmounts,
  loadOperatingTargets,
} from '../allocation/runner.queries'
import { createVarianceSnapshots } from './variance-snapshot'
import type { VarianceTx } from './variance-snapshot'

// Type-safe guards replacing the previous unsafe `as unknown as Record<>` cast.
// Production PrismaClient always has all tables; narrow test mocks may omit some.
interface PrismaWithAllocationRules {
  allocationRule: PrismaClient['allocationRule']
}
interface PrismaWithCostEntries {
  costEntry: PrismaClient['costEntry']
  transferMarkup: PrismaClient['transferMarkup']
}

function hasAllocationRules(p: PrismaClient): p is PrismaClient & PrismaWithAllocationRules {
  return 'allocationRule' in p && typeof (p as PrismaClient & PrismaWithAllocationRules).allocationRule?.findMany === 'function'
}

function hasCostEntries(p: PrismaClient): p is PrismaClient & PrismaWithCostEntries {
  return 'costEntry' in p && typeof (p as PrismaClient & PrismaWithCostEntries).costEntry?.findMany === 'function'
}

// Guard for the transaction-client subset needed by createVarianceSnapshots.
// Narrow test mocks that omit costEntry or varianceSnapshot take the zero path.
function hasTxVariance(tx: unknown): tx is VarianceTx {
  if (tx === null || typeof tx !== 'object') return false
  const t = tx as Record<string, unknown>
  return (
    typeof (t['varianceSnapshot'] as Record<string, unknown> | undefined)?.['createMany'] === 'function' &&
    typeof (t['costEntry'] as Record<string, unknown> | undefined)?.['findMany'] === 'function' &&
    typeof (t['period'] as Record<string, unknown> | undefined)?.['findFirst'] === 'function'
  )
}

export interface CloseResult {
  periodId: string
  status: 'CLOSED'
  allocationRunId: string
  transferCount: number
  emptyPool: boolean
  snapshotCount: number
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
  // Pre-validate for user-friendly error messages (non-authoritative — see transaction guard below).
  const period = await prisma.period.findUnique({ where: { id: periodId } })
  if (!period) throw new Error(`Period not found: ${periodId}`)
  if (period.status === 'CLOSED') throw new Error(`Period ${periodId} is already CLOSED`)

  const startedAt = Date.now()

  // Load allocation inputs — use empty arrays for narrow test mocks that do not
  // expose the allocation tables. hasAllocationRules uses a typed interface check
  // rather than an unsafe cast.
  const [rules, poolAmounts, targets]: [
    Awaited<ReturnType<typeof loadAllocationRules>>,
    Pool[],
    DirectTarget[],
  ] = hasAllocationRules(prisma)
    ? await Promise.all([
        loadAllocationRules(prisma),
        loadPoolAmounts(prisma, periodId) as Promise<Pool[]>,
        loadOperatingTargets(prisma, periodId) as Promise<DirectTarget[]>,
      ])
    : [[], [], []]

  // emptyPool=true when all pool amounts are zero — close still proceeds, result is flagged.
  const emptyPool = poolAmounts.length === 0 || poolAmounts.every((p) => p.amount.isZero())

  // Build allocation checksums
  const inputEntries: ChecksumInputEntry[] = poolAmounts.map((p) => ({
    poolOrgId: p.orgId,
    amount: p.amount.toFixed(),
  }))
  const inputRules: ChecksumInputRule[] = rules.map((r) => ({
    poolOrgId: r.poolOrgId,
    allocationKey: r.allocationKey,
    method: r.method,
    sequence: r.sequence,
  }))
  const inputChecksum = checksumInput(inputEntries, inputRules)

  // computeAllocations is shared with runner.ts via lib/allocation/compute.ts
  const stepResults = computeAllocations(method, rules, poolAmounts, targets)

  const outputForChecksum: ChecksumOutputResult[] = stepResults.map((r) => ({
    fromPoolOrgId: r.fromPoolOrgId,
    toProjectId: r.toProjectId,
    amount: r.amount.toFixed(),
  }))
  const outputChecksum = checksumOutput(outputForChecksum)
  const runtimeMs = Date.now() - startedAt

  // Load cost entries and markups for transfer pricing — skip for narrow test mocks.
  const transferEntries = hasCostEntries(prisma)
    ? await loadTransferEntries(prisma, periodId)
    : []

  // Persist everything in one transaction.
  // The period.update inside uses WHERE status='OPEN' as the authoritative
  // double-close guard — a concurrent request that passes the pre-validation
  // above will fail here with P2025 if the period was already closed.
  const { run, transferCount, snapshotCount } = await prisma.$transaction(async (tx) => {
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

    // WHERE status='OPEN' is the concurrency guard: if the period was closed by
    // a concurrent request after the pre-validation above, Prisma throws P2025
    // and the transaction rolls back, leaving no AllocationRun row committed.
    await tx.period.update({
      where: { id: periodId, status: 'OPEN' },
      data: { status: 'CLOSED', closedAt: new Date() },
    })

    // REQ-PIPE-01: Create VarianceSnapshot rows in the same transaction so that
    // failure rolls back the entire close (REQ-PIPE-04). Narrow test mocks that
    // do not expose costEntry/varianceSnapshot/period.findFirst take count = 0.
    const snapCount = hasTxVariance(tx) ? await createVarianceSnapshots(tx, periodId) : 0

    return { run: created, transferCount: count, snapshotCount: snapCount }
  })

  return {
    periodId,
    status: 'CLOSED',
    allocationRunId: run.id,
    transferCount,
    emptyPool,
    snapshotCount,
  }
}

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
