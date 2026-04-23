import { describe, it, expect } from 'vitest'
import {
  AllocationRunSchema,
  AllocationRuleCreateSchema,
  AllocationRuleUpdateSchema,
  AllocationRuleDeleteSchema,
} from '@/lib/zod/allocation'

const VALID_ID = 'cld1234567890abcdefghijk'

describe('AllocationRunSchema', () => {
  it('accepts valid run input', () => {
    const result = AllocationRunSchema.safeParse({
      periodId: VALID_ID,
      method: 'DIRECT',
    })
    expect(result.success).toBe(true)
  })

  it('accepts STEP_DOWN method', () => {
    const result = AllocationRunSchema.safeParse({
      periodId: VALID_ID,
      method: 'STEP_DOWN',
    })
    expect(result.success).toBe(true)
  })

  it('rejects unknown method', () => {
    const result = AllocationRunSchema.safeParse({
      periodId: VALID_ID,
      method: 'PROPORTIONAL',
    })
    expect(result.success).toBe(false)
  })
})

describe('AllocationRuleCreateSchema', () => {
  it('accepts valid rule without sequence', () => {
    const result = AllocationRuleCreateSchema.safeParse({
      poolOrgId: VALID_ID,
      allocationKey: 'HEADCOUNT',
      method: 'DIRECT',
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid rule with sequence', () => {
    const result = AllocationRuleCreateSchema.safeParse({
      poolOrgId: VALID_ID,
      allocationKey: 'DIRECT_LABOR_HOURS',
      method: 'STEP_DOWN',
      sequence: 1,
    })
    expect(result.success).toBe(true)
  })

  it('rejects negative sequence', () => {
    const result = AllocationRuleCreateSchema.safeParse({
      poolOrgId: VALID_ID,
      allocationKey: 'HEADCOUNT',
      method: 'DIRECT',
      sequence: -1,
    })
    expect(result.success).toBe(false)
  })

  it('rejects unknown allocationKey', () => {
    const result = AllocationRuleCreateSchema.safeParse({
      poolOrgId: VALID_ID,
      allocationKey: 'SQUARE_FOOTAGE',
      method: 'DIRECT',
    })
    expect(result.success).toBe(false)
  })
})

describe('AllocationRuleUpdateSchema', () => {
  it('accepts id with partial fields', () => {
    const result = AllocationRuleUpdateSchema.safeParse({
      id: VALID_ID,
      sequence: 2,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = AllocationRuleUpdateSchema.safeParse({ method: 'DIRECT' })
    expect(result.success).toBe(false)
  })
})

describe('AllocationRuleDeleteSchema', () => {
  it('accepts valid id', () => {
    const result = AllocationRuleDeleteSchema.safeParse({ id: VALID_ID })
    expect(result.success).toBe(true)
  })
})
