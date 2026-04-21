import type { PrismaClient, AllocationRun } from '@prisma/client'
import { AllocationMethod } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { DirectTarget, AllocationKey } from './direct'
import type { Pool, StepDownResult } from './stepDown'
import { computeAllocations } from './compute'
import {
  checksumInput,
  checksumOutput,
  type ChecksumInputEntry,
  type ChecksumInputRule,
  type ChecksumOutputResult,
} from './checksum'
import {
  loadAllocationRules,
  loadPoolAmounts,
  loadOperatingTargets,
} from './runner.queries'

/**
 * Orchestrate an allocation run for the given period.
 *
 * Responsibilities:
 *  - Load pool amounts, rules, and operating targets from the DB
 *  - Invoke the pure-function engine (direct or step-down)
 *  - Compute deterministic input/output checksums (REQ-ALLOC-04)
 *  - Persist AllocationRun + AllocationResult rows in a single transaction
 *  - Record runtimeMs (REQ-ALLOC-05)
 */
export async function runAllocation(
  prisma: PrismaClient,
  periodId: string,
  method: AllocationMethod,
): Promise<AllocationRun> {
  const startedAt = Date.now()

  // @AX:WARN: [AUTO] Promise.all without per-promise error handling — if any loader rejects the entire Promise.all rejects, losing context about which query failed
  // @AX:REASON: in a DB-failure scenario the error message will not indicate which of the three queries failed; wrap in individual try/catch or use Promise.allSettled if partial-failure diagnosis is needed
  const [rules, poolAmounts, targets] = await Promise.all([
    loadAllocationRules(prisma),
    loadPoolAmounts(prisma, periodId),
    loadOperatingTargets(prisma, periodId),
  ])

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

  const stepResults = computeAllocations(method, rules, poolAmounts, targets)

  const outputForChecksum: ChecksumOutputResult[] = stepResults.map((r) => ({
    fromPoolOrgId: r.fromPoolOrgId,
    toProjectId: r.toProjectId,
    amount: r.amount.toFixed(),
  }))
  const outputChecksum = checksumOutput(outputForChecksum)

  // @AX:NOTE: [AUTO] runtimeMs includes DB query time but NOT transaction commit time; the stopwatch is taken before the $transaction call, so commit latency is excluded from REQ-ALLOC-05 measurement
  const runtimeMs = Date.now() - startedAt

  const run = await prisma.$transaction(async (tx) => {
    const created = await tx.allocationRun.create({
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
    return created
  })

  return run
}

// Re-export Decimal for callers that need to construct pool amounts in tests.
export { Decimal }
