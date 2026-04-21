import { describe, it, expect, vi } from 'vitest'
import { aggregateProject } from '../../../lib/aggregation/project'

describe('aggregateProject', () => {
  it('returns aggregation grouped by projectId', async () => {
    const mockPrisma = {
      costEntry: {
        groupBy: vi.fn().mockResolvedValue([
          { projectId: 'proj-1', _sum: { amount: '4000.00' } },
          { projectId: 'proj-2', _sum: { amount: '1500.00' } },
        ]),
      },
    } as any

    const result = await aggregateProject(mockPrisma, 'period-1')
    expect(result).toHaveLength(2)

    const p1 = result.find((r) => r.projectId === 'proj-1')
    expect(p1).toBeDefined()
    expect(Number(p1!.total)).toBeCloseTo(4000, 2)

    const p2 = result.find((r) => r.projectId === 'proj-2')
    expect(p2).toBeDefined()
    expect(Number(p2!.total)).toBeCloseTo(1500, 2)
  })

  it('falls back to "0" when _sum.amount is null', async () => {
    const mockPrisma = {
      costEntry: {
        groupBy: vi.fn().mockResolvedValue([
          { projectId: 'proj-x', _sum: { amount: null } },
        ]),
      },
    } as any

    const result = await aggregateProject(mockPrisma, 'period-2')
    expect(result).toHaveLength(1)
    expect(result[0].total).toBe('0')
  })

  it('returns empty array when period has no entries', async () => {
    const mockPrisma = {
      costEntry: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
    } as any

    const result = await aggregateProject(mockPrisma, 'empty-period')
    expect(result).toHaveLength(0)
  })
})
