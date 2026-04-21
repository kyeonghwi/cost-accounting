import { describe, it, expect } from 'vitest'
import {
  TransferMarkupCreateSchema,
  TransferMarkupUpdateSchema,
  TransferMarkupDeleteSchema,
} from '@/lib/zod/transfer'

const VALID_ID = 'cld1234567890abcdefghijk'
const VALID_DATE = '2024-01-01T00:00:00.000Z'

describe('TransferMarkupCreateSchema', () => {
  it('accepts valid markup without effectiveTo', () => {
    const result = TransferMarkupCreateSchema.safeParse({
      fromHqId: VALID_ID,
      toHqId: VALID_ID,
      markupPct: '5.0000',
      effectiveFrom: VALID_DATE,
    })
    expect(result.success).toBe(true)
  })

  it('accepts valid markup with effectiveTo', () => {
    const result = TransferMarkupCreateSchema.safeParse({
      fromHqId: VALID_ID,
      toHqId: VALID_ID,
      markupPct: '5.0000',
      effectiveFrom: VALID_DATE,
      effectiveTo: '2024-12-31T00:00:00.000Z',
    })
    expect(result.success).toBe(true)
  })

  it('rejects markupPct with 5 decimal places', () => {
    const result = TransferMarkupCreateSchema.safeParse({
      fromHqId: VALID_ID,
      toHqId: VALID_ID,
      markupPct: '5.12345',
      effectiveFrom: VALID_DATE,
    })
    expect(result.success).toBe(false)
  })

  it('rejects non-datetime effectiveFrom', () => {
    const result = TransferMarkupCreateSchema.safeParse({
      fromHqId: VALID_ID,
      toHqId: VALID_ID,
      markupPct: '5.0000',
      effectiveFrom: '2024-01-01',
    })
    expect(result.success).toBe(false)
  })
})

describe('TransferMarkupUpdateSchema', () => {
  it('accepts id with partial fields', () => {
    const result = TransferMarkupUpdateSchema.safeParse({
      id: VALID_ID,
      markupPct: '3.5000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = TransferMarkupUpdateSchema.safeParse({ markupPct: '3.5000' })
    expect(result.success).toBe(false)
  })
})

describe('TransferMarkupDeleteSchema', () => {
  it('accepts valid id', () => {
    const result = TransferMarkupDeleteSchema.safeParse({ id: VALID_ID })
    expect(result.success).toBe(true)
  })
})
