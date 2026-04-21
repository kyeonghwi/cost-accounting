import { describe, it, expect, vi } from 'vitest'
// These imports will fail until T3 is implemented — that's correct (RED)
import { aggregatePersonnel } from '../../../lib/aggregation/personnel'

describe('aggregatePersonnel', () => {
  it('returns aggregation grouped by personnelId', async () => {
    const mockPrisma = {
      costEntry: {
        groupBy: vi.fn().mockResolvedValue([
          { personnelId: 'p1', _sum: { amount: '1000.0000' } },
          { personnelId: 'p2', _sum: { amount: '2000.0000' } },
        ]),
      },
    } as any
    const result = await aggregatePersonnel(mockPrisma, 'period-1')
    expect(result).toHaveLength(2)
    expect(result[0].personnelId).toBe('p1')
  })
  it('returns empty array for period with no entries', async () => {
    const mockPrisma = {
      costEntry: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
    } as any
    const result = await aggregatePersonnel(mockPrisma, 'empty-period')
    expect(result).toHaveLength(0)
  })
})
