import { AllocationMethod } from '@prisma/client'
import { directAllocate, type DirectTarget, type AllocationKey } from './direct'
import { stepDownAllocate, type Pool, type StepDownResult } from './stepDown'

interface RuleRow {
  poolOrgId: string
  allocationKey: AllocationKey
  method: string
  sequence: number | null
}

/**
 * Pure function: dispatch to direct or step-down engine based on method.
 * Shared by runner.ts (standalone allocation runs) and workflow.ts (monthly close).
 */
export function computeAllocations(
  method: AllocationMethod | string,
  rules: RuleRow[],
  pools: Pool[],
  targets: DirectTarget[],
): StepDownResult[] {
  if (method === AllocationMethod.STEP_DOWN || method === 'STEP_DOWN') {
    const sequence = rules
      .filter((r) => (r.method === AllocationMethod.STEP_DOWN || r.method === 'STEP_DOWN') && r.sequence !== null)
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
      results.push({ fromPoolOrgId: pool.orgId, toProjectId: d.projectId, amount: d.amount })
    }
  }
  return results
}
