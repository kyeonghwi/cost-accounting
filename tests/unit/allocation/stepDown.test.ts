import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { stepDownAllocate } from '../../../lib/allocation/stepDown'

// Inline type stubs
interface Pool {
  orgId: string
  amount: Decimal
}

interface Target {
  projectId: string
  headcount: number
  directLaborHours: Decimal
  directCost: Decimal
}

interface AllocationResult {
  fromPoolOrgId: string
  toProjectId: string
  amount: Decimal
}

describe('stepDownAllocate', () => {
  it('should allocate 2 service departments to 2 operating departments in configured sequence', () => {
    // Sequence: SVC-A first, then SVC-B
    // SVC-A pool: 4000, SVC-B pool: 2000
    // 2 operating depts (P1, P2) each with headcount 1
    const pools: Pool[] = [
      { orgId: 'SVC-A', amount: new Decimal('4000.0000') },
      { orgId: 'SVC-B', amount: new Decimal('2000.0000') },
    ]
    const sequence = ['SVC-A', 'SVC-B']
    const targets: Target[] = [
      { projectId: 'OPR-1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'OPR-2', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = stepDownAllocate(pools, sequence, targets)
    expect(results.length).toBeGreaterThan(0)
    // Total allocated to operating depts must equal total pool (4000 + 2000)
    const totalAllocated = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(totalAllocated.equals(new Decimal('6000.0000'))).toBe(true)
    // All results point to operating department targets
    for (const r of results) {
      expect(['OPR-1', 'OPR-2']).toContain(r.toProjectId)
    }
  })

  it('should not allocate back to a service department once it has been fully allocated', () => {
    // SVC-A is allocated first; it must NOT appear as toProjectId in any result
    const pools: Pool[] = [
      { orgId: 'SVC-A', amount: new Decimal('3000.0000') },
      { orgId: 'SVC-B', amount: new Decimal('1500.0000') },
    ]
    const sequence = ['SVC-A', 'SVC-B']
    const targets: Target[] = [
      { projectId: 'OPR-1', headcount: 3, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'OPR-2', headcount: 7, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = stepDownAllocate(pools, sequence, targets)
    // No result should send allocation back to SVC-A
    const feedbackToA = results.filter((r) => r.toProjectId === 'SVC-A')
    expect(feedbackToA).toHaveLength(0)
    // SVC-B should also not receive any allocation (it is itself a service dept)
    const feedbackToB = results.filter((r) => r.toProjectId === 'SVC-B')
    expect(feedbackToB).toHaveLength(0)
  })

  it('should handle 3 service departments where each successive dept receives from prior depts', () => {
    // SVC-A (5000) → SVC-B (2000) → SVC-C (1000) → [OPR-1, OPR-2]
    // After SVC-A is allocated, its amount spreads to SVC-B, SVC-C, OPR-1, OPR-2
    // After SVC-B (augmented by SVC-A share), allocates to SVC-C, OPR-1, OPR-2
    // After SVC-C (augmented), allocates to OPR-1, OPR-2
    const pools: Pool[] = [
      { orgId: 'SVC-A', amount: new Decimal('5000.0000') },
      { orgId: 'SVC-B', amount: new Decimal('2000.0000') },
      { orgId: 'SVC-C', amount: new Decimal('1000.0000') },
    ]
    const sequence = ['SVC-A', 'SVC-B', 'SVC-C']
    const targets: Target[] = [
      { projectId: 'OPR-1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'OPR-2', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = stepDownAllocate(pools, sequence, targets)
    // All amounts eventually reach operating depts
    const operatingResults = results.filter((r) => ['OPR-1', 'OPR-2'].includes(r.toProjectId))
    const totalToOperating = operatingResults.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    // Total allocated to operating depts must equal total pool: 5000 + 2000 + 1000 = 8000
    expect(totalToOperating.equals(new Decimal('8000.0000'))).toBe(true)
    // No feedback to earlier-allocated service depts
    expect(results.filter((r) => r.toProjectId === 'SVC-A')).toHaveLength(0)
  })
})
