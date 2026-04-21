import { describe, it, expect } from 'vitest'
import {
  CostEntryCreateSchema,
  CostEntryUpdateSchema,
  CostEntryDeleteSchema,
} from '@/lib/zod/costEntry'

const VALID_ID = 'cld1234567890abcdefghijk'
const VALID_DATE = '2024-01-15T00:00:00.000Z'

describe('CostEntryCreateSchema', () => {
  it('accepts a valid cost entry', () => {
    const result = CostEntryCreateSchema.safeParse({
      personnelId: VALID_ID,
      projectId: VALID_ID,
      periodId: VALID_ID,
      date: VALID_DATE,
      hours: '8.0000',
      amount: '1000.0000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects zero hours', () => {
    const result = CostEntryCreateSchema.safeParse({
      personnelId: VALID_ID,
      projectId: VALID_ID,
      periodId: VALID_ID,
      date: VALID_DATE,
      hours: '0',
      amount: '1000.0000',
    })
    expect(result.success).toBe(false)
  })

  it('rejects amount with more than 4 decimal places', () => {
    const result = CostEntryCreateSchema.safeParse({
      personnelId: VALID_ID,
      projectId: VALID_ID,
      periodId: VALID_ID,
      date: VALID_DATE,
      hours: '8.0000',
      amount: '1000.12345',
    })
    expect(result.success).toBe(false)
  })

  it('rejects empty personnelId', () => {
    const result = CostEntryCreateSchema.safeParse({
      personnelId: '',
      projectId: VALID_ID,
      periodId: VALID_ID,
      date: VALID_DATE,
      hours: '8.0000',
      amount: '1000.0000',
    })
    expect(result.success).toBe(false)
  })
})

describe('CostEntryUpdateSchema', () => {
  it('accepts id-only partial update', () => {
    const result = CostEntryUpdateSchema.safeParse({ id: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = CostEntryUpdateSchema.safeParse({ hours: '4.0' })
    expect(result.success).toBe(false)
  })
})

describe('CostEntryDeleteSchema', () => {
  it('accepts valid id', () => {
    const result = CostEntryDeleteSchema.safeParse({ id: VALID_ID })
    expect(result.success).toBe(true)
  })

  it('rejects empty id', () => {
    const result = CostEntryDeleteSchema.safeParse({ id: '' })
    expect(result.success).toBe(false)
  })
})
