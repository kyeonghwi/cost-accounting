import type { PrismaClient, AllocationRun } from '@prisma/client'
import { AllocationMethod } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { directAllocate, type DirectTarget, type AllocationKey } from './direct'
import { stepDownAllocate, type Pool, type StepDownResult } from './stepDown'
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

interface RuleRow {
  poolOrgId: string
  allocationKey: AllocationKey
  method: AllocationMethod
  sequence: number | null
}

function computeAllocations(
  method: AllocationMethod,
  rules: RuleRow[],
  pools: Pool[],
  targets: DirectTarget[],
): StepDownResult[] {
  if (method === AllocationMethod.STEP_DOWN) {
    const sequence = rules
      .filter((r) => r.method === AllocationMethod.STEP_DOWN && r.sequence !== null)
      .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0))
      .map((r) => r.poolOrgId)
    return stepDownAllocate(pools, sequence, targets)
  }

  // DIRECT: distribute each pool independently using its rule's key.
  const results: StepDownResult[] = []
  const ruleByPool = new Map(rules.map((r) => [r.poolOrgId, r]))
  for (const pool of pools) {
    if (pool.amount.isZero()) continue
    const rule = ruleByPool.get(pool.orgId)
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

// Re-export Decimal for callers that need to construct pool amounts in tests.
export { Decimal }
