import { describe, it, expect, vi } from 'vitest'
import { aggregateEnterprise } from '../../../lib/aggregation/enterprise'

describe('aggregateEnterprise', () => {
  it('returns grand total for period', async () => {
    const mockPrisma = {
      costEntry: {
        aggregate: vi.fn().mockResolvedValue({
          _sum: { amount: '3000.0000' },
        }),
      },
    } as any
    const result = await aggregateEnterprise(mockPrisma, 'period-1')
    expect(Number(result.total)).toBeCloseTo(3000, 2)
  })
})
