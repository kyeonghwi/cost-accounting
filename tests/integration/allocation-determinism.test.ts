import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { directAllocate } from '../../lib/allocation/direct'
import { stepDownAllocate } from '../../lib/allocation/stepDown'
import { checksumInput, checksumOutput, canonicalJson } from '../../lib/allocation/checksum'

// Determinism check at the engine layer (REQ-ALLOC-04). Two invocations on
// identical inputs MUST produce byte-identical input and output checksums.
// This test does not require a DB — the pure-function engine is sufficient
// to prove determinism; runner.ts simply persists the same byte-identical
// checksum values.

describe('allocation determinism', () => {
  const pool = new Decimal('10000.0000')
  const rule = { allocationKey: 'HEADCOUNT' as const }
  const targets = [
    { projectId: 'p-a', headcount: 3, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
    { projectId: 'p-b', headcount: 7, directLaborHours: new Decimal('0'), directCost: new Decimal('0') },
  ]

  it('produces byte-identical output checksums across two direct-allocation runs', () => {
    const first = directAllocate(pool, rule, targets).map((r) => ({
      fromPoolOrgId: 'SVC',
      toProjectId: r.projectId,
      amount: r.amount.toFixed(),
    }))
    const second = directAllocate(pool, rule, targets).map((r) => ({
      fromPoolOrgId: 'SVC',
      toProjectId: r.projectId,
      amount: r.amount.toFixed(),
    }))
    expect(checksumOutput(first)).toBe(checksumOutput(second))
  })

  it('produces byte-identical input checksums for the same pool amounts and rules', () => {
    const entries = [
      { poolOrgId: 'SVC-A', amount: '4000.0000' },
      { poolOrgId: 'SVC-B', amount: '2000.0000' },
    ]
    const rules = [
      { poolOrgId: 'SVC-A', allocationKey: 'HEADCOUNT', method: 'STEP_DOWN', sequence: 1 },
      { poolOrgId: 'SVC-B', allocationKey: 'HEADCOUNT', method: 'STEP_DOWN', sequence: 2 },
    ]
    const first = checksumInput(entries, rules)
    const second = checksumInput(entries, rules)
    expect(first).toBe(second)
  })

  it('produces byte-identical input checksums regardless of input ordering', () => {
    const a = [
      { poolOrgId: 'SVC-A', amount: '4000.0000' },
      { poolOrgId: 'SVC-B', amount: '2000.0000' },
    ]
    const b = [
      { poolOrgId: 'SVC-B', amount: '2000.0000' },
      { poolOrgId: 'SVC-A', amount: '4000.0000' },
    ]
    expect(checksumInput(a, [])).toBe(checksumInput(b, []))
  })

  it('produces byte-identical step-down checksums across two runs', () => {
    const pools = [
      { orgId: 'SVC-A', amount: new Decimal('3000.0000') },
      { orgId: 'SVC-B', amount: new Decimal('1500.0000') },
    ]
    const sequence = ['SVC-A', 'SVC-B']
    const first = stepDownAllocate(pools, sequence, targets).map((r) => ({
      fromPoolOrgId: r.fromPoolOrgId,
      toProjectId: r.toProjectId,
      amount: r.amount.toFixed(),
    }))
    const second = stepDownAllocate(pools, sequence, targets).map((r) => ({
      fromPoolOrgId: r.fromPoolOrgId,
      toProjectId: r.toProjectId,
      amount: r.amount.toFixed(),
    }))
    expect(checksumOutput(first)).toBe(checksumOutput(second))
  })

  it('canonicalJson sorts keys recursively', () => {
    const a = canonicalJson({ b: 2, a: { y: 1, x: 2 } })
    const b = canonicalJson({ a: { x: 2, y: 1 }, b: 2 })
    expect(a).toBe(b)
  })
})
