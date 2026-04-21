import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { stepDownAllocate } from '../../../lib/allocation/stepDown'

// Edge-case tests targeting uncovered branches in stepDown.ts:
//   line 46  — targets.length === 0 returns []
//   line 52  — pool not found in map (continue)
//   line 53  — pool.amount.isZero() (continue)

describe('stepDownAllocate — edge cases', () => {
  it('returns empty array when targets list is empty', () => {
    // Covers line 46: if (targets.length === 0) return []
    const pools = [{ orgId: 'SVC-A', amount: new Decimal('5000.0000') }]
    const sequence = ['SVC-A']
    const results = stepDownAllocate(pools, sequence, [])
    expect(results).toHaveLength(0)
  })

  it('skips an orgId in sequence that has no matching pool', () => {
    // Covers line 52: if (!pool) continue
    const pools = [{ orgId: 'SVC-A', amount: new Decimal('2000.0000') }]
    // SVC-MISSING is in the sequence but not in pools
    const sequence = ['SVC-MISSING', 'SVC-A']
    const targets = [
      { projectId: 'P1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = stepDownAllocate(pools, sequence, targets)
    // Only SVC-A allocates; SVC-MISSING produces no rows
    expect(results.every((r) => r.fromPoolOrgId === 'SVC-A')).toBe(true)
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(new Decimal('2000.0000'))).toBe(true)
  })

  it('skips a pool with zero amount', () => {
    // Covers line 53: if (pool.amount.isZero()) continue
    const pools = [
      { orgId: 'SVC-A', amount: new Decimal('0.0000') },
      { orgId: 'SVC-B', amount: new Decimal('1000.0000') },
    ]
    const sequence = ['SVC-A', 'SVC-B']
    const targets = [
      { projectId: 'P1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = stepDownAllocate(pools, sequence, targets)
    // SVC-A produces no rows; only SVC-B allocates
    expect(results.filter((r) => r.fromPoolOrgId === 'SVC-A')).toHaveLength(0)
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(new Decimal('1000.0000'))).toBe(true)
  })

  it('returns empty array when sequence is empty', () => {
    const pools = [{ orgId: 'SVC-A', amount: new Decimal('5000.0000') }]
    const targets = [
      { projectId: 'P1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = stepDownAllocate(pools, [], targets)
    expect(results).toHaveLength(0)
  })

  it('returns empty array when both pools and sequence are empty', () => {
    const targets = [
      { projectId: 'P1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = stepDownAllocate([], [], targets)
    expect(results).toHaveLength(0)
  })
})
