import { Decimal } from '@prisma/client/runtime/library'
import { lastStepAdjust, sum, toMoney, zero } from './decimal'

// Pure-function direct allocation. NO Prisma imports — keeps the engine
// deterministically unit-testable.

export type AllocationKey = 'HEADCOUNT' | 'DIRECT_LABOR_HOURS' | 'DIRECT_COST'

export interface AllocationRule {
  allocationKey: AllocationKey
}

export interface DirectTarget {
  projectId: string
  headcount: number
  directLaborHours: Decimal
  directCost: Decimal
}

export interface AllocationResult {
  projectId: string
  amount: Decimal
}

function weightOf(target: DirectTarget, key: AllocationKey): Decimal {
  switch (key) {
    case 'HEADCOUNT':
      return new Decimal(target.headcount)
    case 'DIRECT_LABOR_HOURS':
      return target.directLaborHours
    case 'DIRECT_COST':
      return target.directCost
  }
}

/**
 * Distribute a pool amount to targets proportionally by the configured allocation key.
 *
 * Guarantees:
 *  - sum(result.amount) === pool exactly (via lastStepAdjust on residual rounding)
 *  - Output preserves input target order (deterministic)
 *  - Pure function: no I/O, no Prisma
 */
// @AX:ANCHOR: [AUTO] public API contract — primary allocation primitive called by stepDown.ts, runner.ts (x2), and integration tests; signature and sum-conservation guarantee (REQ-ALLOC-01) must be preserved
// @AX:REASON: fan_in >= 3 across production callers; any signature change or behavioral regression breaks multiple allocation paths simultaneously
export function directAllocate(
  pool: Decimal,
  rule: AllocationRule,
  targets: DirectTarget[],
): AllocationResult[] {
  if (targets.length === 0) return []

  // Zero pool short-circuit: every target receives zero.
  if (pool.isZero()) {
    return targets.map((t) => ({ projectId: t.projectId, amount: toMoney(zero()) }))
  }

  const weights = targets.map((t) => weightOf(t, rule.allocationKey))
  const totalWeight = sum(weights)

  // Degenerate case: no positive weight — fall back to equal split so the
  // pool is conserved.
  if (totalWeight.isZero()) {
    const equalShare = pool.dividedBy(targets.length)
    const raw = targets.map(() => equalShare)
    const adjusted = lastStepAdjust(pool, raw)
    return targets.map((t, i) => ({ projectId: t.projectId, amount: adjusted[i] }))
  }

  const raw = weights.map((w) => pool.times(w).dividedBy(totalWeight))
  const adjusted = lastStepAdjust(pool, raw)

  return targets.map((t, i) => ({ projectId: t.projectId, amount: adjusted[i] }))
}
