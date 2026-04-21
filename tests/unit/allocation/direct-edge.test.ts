import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { directAllocate } from '../../../lib/allocation/direct'

// Edge-case tests targeting uncovered branches in direct.ts:
//   lines 64-68 — totalWeight.isZero() equal-split fallback

describe('directAllocate — degenerate cases', () => {
  it('falls back to equal split when all targets have zero HEADCOUNT', () => {
    // All weights are 0 => totalWeight is zero => equal-split branch (lines 63-68)
    const pool = new Decimal('1200.0000')
    const rule = { allocationKey: 'HEADCOUNT' as const }
    const targets = [
      { projectId: 'p1', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p3', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(3)
    // Each receives 400 (1200 / 3)
    for (const r of results) {
      expect(r.amount.toString()).toBe('400.0000')
    }
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('falls back to equal split when all targets have zero DIRECT_LABOR_HOURS', () => {
    const pool = new Decimal('500.0000')
    const rule = { allocationKey: 'DIRECT_LABOR_HOURS' as const }
    const targets = [
      { projectId: 'p1', headcount: 5, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 5, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(2)
    // 500 / 2 = 250 each
    expect(results[0].amount.toString()).toBe('250.0000')
    expect(results[1].amount.toString()).toBe('250.0000')
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('falls back to equal split when all targets have zero DIRECT_COST', () => {
    const pool = new Decimal('3000.0000')
    const rule = { allocationKey: 'DIRECT_COST' as const }
    const targets = [
      { projectId: 'p1', headcount: 10, directLaborHours: new Decimal('100'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 20, directLaborHours: new Decimal('200'), directCost: new Decimal('0') },
    ]
    const results = directAllocate(pool, rule, targets)
    expect(results).toHaveLength(2)
    // 3000 / 2 = 1500 each
    expect(results[0].amount.toString()).toBe('1500.0000')
    expect(results[1].amount.toString()).toBe('1500.0000')
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('returns empty array when targets is empty', () => {
    const pool = new Decimal('5000.0000')
    const rule = { allocationKey: 'HEADCOUNT' as const }
    const results = directAllocate(pool, rule, [])
    expect(results).toHaveLength(0)
  })

  it('equal-split adjusts last bucket via lastStepAdjust when pool is not evenly divisible', () => {
    // 1000 / 3 = 333.3333... — last bucket must absorb residual
    const pool = new Decimal('1000.0000')
    const rule = { allocationKey: 'HEADCOUNT' as const }
    const targets = [
      { projectId: 'p1', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p2', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
      { projectId: 'p3', headcount: 0, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    ]
    const results = directAllocate(pool, rule, targets)
    const total = results.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })
})
