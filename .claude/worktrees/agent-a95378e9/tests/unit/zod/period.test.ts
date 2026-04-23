import { describe, it, expect } from 'vitest'
import { PeriodCloseSchema } from '@/lib/zod/period'

const VALID_ID = 'cld1234567890abcdefghijk'

describe('PeriodCloseSchema', () => {
  it('accepts valid periodId', () => {
    const result = PeriodCloseSchema.safeParse({ periodId: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects empty periodId', () => {
    const result = PeriodCloseSchema.safeParse({ periodId: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing periodId', () => {
    const result = PeriodCloseSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
