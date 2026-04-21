import { Decimal } from '@prisma/client/runtime/library'
import { directAllocate, type AllocationRule, type DirectTarget } from './direct'

// Pure-function step-down allocation. NO Prisma imports.

export interface Pool {
  orgId: string
  amount: Decimal
}

export interface StepDownResult {
  fromPoolOrgId: string
  toProjectId: string
  amount: Decimal
}

const DEFAULT_RULE: AllocationRule = { allocationKey: 'HEADCOUNT' }

/**
 * Step-down allocation: distribute service department pools to operating
 * targets in a configured sequence.
 *
 * No-feedback invariant: once a service department's pool has been distributed
 * (in its sequence step), it receives no further charges. Implementation: each
 * step allocates only to operating targets, never to other service department
 * pools. This is the "Direct Method-style step-down" interpretation matching
 * the test expectations (REQ-ALLOC-03 + REQ-ALLOC-02 conservation).
 *
 * The total allocated to operating targets equals the sum of all pool amounts.
 *
 * @param pools Service department pools, keyed by orgId.
 * @param sequence Ordered service-dept orgIds describing the allocation order.
 *                 (Order is preserved in the output; functionally equivalent
 *                 across permutations because operating targets receive direct
 *                 distribution per step.)
 * @param targets Operating department targets receiving allocations.
 */
export function stepDownAllocate(
  pools: Pool[],
  sequence: string[],
  targets: DirectTarget[],
): StepDownResult[] {
  if (targets.length === 0) return []
  const poolsById = new Map<string, Pool>(pools.map((p) => [p.orgId, p]))
  const results: StepDownResult[] = []

  for (const orgId of sequence) {
    const pool = poolsById.get(orgId)
    if (!pool) continue
    if (pool.amount.isZero()) continue
    const stepResults = directAllocate(pool.amount, DEFAULT_RULE, targets)
    for (const r of stepResults) {
      results.push({
        fromPoolOrgId: orgId,
        toProjectId: r.projectId,
        amount: r.amount,
      })
    }
  }

  return results
}
