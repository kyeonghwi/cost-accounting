import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { directAllocate } from '../../../lib/allocation/direct'

// Inline type stubs — no shared fixtures yet
interface AllocationRule {
  allocationKey: 'HEADCOUNT' | 'DIRECT_LABOR_HOURS' | 'DIRECT_COST'
}

interface Target {
  projectId: string
  headcount: number
  directLaborHours: Decimal
  directCost: Decimal
}

interface AllocationResult {
  projectId: string
  amount: Decimal
}

describe('directAllocate', () => {
  it('should distribute equally when targets have identical weight keys', () => {
    const pool = new Decimal('3000.0000')
    const rule: AllocationRule = { allocationKey: 'HEADCOUNT' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p3', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(3)
    // Each project receives 1000
    for (const r of results) {
      expect(r.amount.toString()).toBe('1000.0000')
    }
    // Sum equals pool exactly
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('should weight allocation by HEADCOUNT proportionally', () => {
    const pool = new Decimal('10000.0000')
    const rule: AllocationRule = { allocationKey: 'HEADCOUNT' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 3, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 7, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(2)
    const p1 = results.find((r) => r.projectId === 'p1')!
    const p2 = results.find((r) => r.projectId === 'p2')!
    // 3/10 * 10000 = 3000, 7/10 * 10000 = 7000
    expect(p1.amount.toString()).toBe('3000.0000')
    expect(p2.amount.toString()).toBe('7000.0000')
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('should weight allocation by DIRECT_LABOR_HOURS proportionally', () => {
    const pool = new Decimal('5000.0000')
    const rule: AllocationRule = { allocationKey: 'DIRECT_LABOR_HOURS' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 0, directLaborHours: new Decimal('200'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 0, directLaborHours: new Decimal('300'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(2)
    const p1 = results.find((r) => r.projectId === 'p1')!
    const p2 = results.find((r) => r.projectId === 'p2')!
    // 200/500 * 5000 = 2000, 300/500 * 5000 = 3000
    expect(p1.amount.toString()).toBe('2000.0000')
    expect(p2.amount.toString()).toBe('3000.0000')
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('should weight allocation by DIRECT_COST proportionally', () => {
    const pool = new Decimal('8000.0000')
    const rule: AllocationRule = { allocationKey: 'DIRECT_COST' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('1000') },
      { projectId: 'p2', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('3000') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(2)
    const p1 = results.find((r) => r.projectId === 'p1')!
    const p2 = results.find((r) => r.projectId === 'p2')!
    // 1000/4000 * 8000 = 2000, 3000/4000 * 8000 = 6000
    expect(p1.amount.toString()).toBe('2000.0000')
    expect(p2.amount.toString()).toBe('6000.0000')
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('should return zero amounts for all targets when pool is zero', () => {
    const pool = new Decimal('0')
    const rule: AllocationRule = { allocationKey: 'HEADCOUNT' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 5, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 3, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p3', headcount: 2, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(3)
    for (const r of results) {
      expect(r.amount.isZero()).toBe(true)
    }
  })

  it('should allocate 100% of pool to a single target', () => {
    const pool = new Decimal('9999.9999')
    const rule: AllocationRule = { allocationKey: 'HEADCOUNT' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 10, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(1)
    expect(results[0].projectId).toBe('p1')
    expect(results[0].amount.equals(pool)).toBe(true)
  })

  it('should ensure sum of allocated amounts equals pool exactly after last-step rounding', () => {
    // 1/3 split produces repeating decimal — last-step rounding must adjust
    const pool = new Decimal('1000.0000')
    const rule: AllocationRule = { allocationKey: 'HEADCOUNT' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p3', headcount: 1, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results: AllocationResult[] = directAllocate(pool, rule, targets)
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('should produce deterministic output for identical inputs across two calls', () => {
    const pool = new Decimal('6000.0000')
    const rule: AllocationRule = { allocationKey: 'HEADCOUNT' }
    const targets: Target[] = [
      { projectId: 'p1', headcount: 2, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 4, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const first: AllocationResult[] = directAllocate(pool, rule, targets)
    const second: AllocationResult[] = directAllocate(pool, rule, targets)
    expect(first).toHaveLength(second.length)
    for (let i = 0; i < first.length; i++) {
      expect(first[i].projectId).toBe(second[i].projectId)
      expect(first[i].amount.equals(second[i].amount)).toBe(true)
    }
  })
})
