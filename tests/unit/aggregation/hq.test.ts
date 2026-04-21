import { describe, it, expect, vi } from 'vitest'
import { aggregateHq } from '../../../lib/aggregation/hq'

const OrgKind = { HQ: 'HQ', DEPARTMENT: 'DEPARTMENT', ENTERPRISE: 'ENTERPRISE' } as const

function makePrisma(entries: unknown[]) {
  return {
    costEntry: {
      findMany: vi.fn().mockResolvedValue(entries),
    },
  } as any
}

describe('aggregateHq', () => {
  it('sums amounts grouped by resolved hqId', async () => {
    const entries = [
      {
        amount: { toString: () => '1000' },
        personnel: { homeHq: { id: 'hq-1', kind: OrgKind.HQ, parentId: null } },
      },
      {
        amount: { toString: () => '500' },
        personnel: { homeHq: { id: 'hq-1', kind: OrgKind.HQ, parentId: null } },
      },
      {
        amount: { toString: () => '200' },
        personnel: { homeHq: { id: 'hq-2', kind: OrgKind.HQ, parentId: null } },
      },
    ]

    const result = await aggregateHq(makePrisma(entries), 'period-1')
    const hq1 = result.find((r) => r.hqId === 'hq-1')
    const hq2 = result.find((r) => r.hqId === 'hq-2')

    expect(hq1).toBeDefined()
    expect(Number(hq1!.total)).toBeCloseTo(1500, 2)
    expect(hq2).toBeDefined()
    expect(Number(hq2!.total)).toBeCloseTo(200, 2)
  })

  it('resolves DEPARTMENT entries via parentId', async () => {
    const entries = [
      {
        amount: { toString: () => '300' },
        personnel: { homeHq: { id: 'dept-1', kind: OrgKind.DEPARTMENT, parentId: 'hq-5' } },
      },
    ]

    const result = await aggregateHq(makePrisma(entries), 'period-1')
    expect(result).toHaveLength(1)
    expect(result[0].hqId).toBe('hq-5')
    expect(Number(result[0].total)).toBeCloseTo(300, 2)
  })

  it('skips ENTERPRISE entries with no resolvable hqId', async () => {
    const entries = [
      {
        amount: { toString: () => '999' },
        personnel: { homeHq: { id: 'ent-1', kind: OrgKind.ENTERPRISE, parentId: null } },
      },
    ]

    const result = await aggregateHq(makePrisma(entries), 'period-1')
    expect(result).toHaveLength(0)
  })

  it('returns empty array when period has no entries', async () => {
    const result = await aggregateHq(makePrisma([]), 'empty-period')
    expect(result).toHaveLength(0)
  })
})
