import { describe, it, expect } from 'vitest'
import {
  OrganizationCreateSchema,
  OrganizationUpdateSchema,
  ProjectCreateSchema,
  PersonnelCreateSchema,
  CostCategoryCreateSchema,
  StandardRateCreateSchema,
} from '@/lib/zod/master'

const VALID_ID = 'cld1234567890abcdefghijk'
const VALID_DATE = '2024-01-01T00:00:00.000Z'

describe('OrganizationCreateSchema', () => {
  it('accepts valid organization', () => {
    const result = OrganizationCreateSchema.safeParse({ name: 'APAC HQ', kind: 'HQ' })
    expect(result.success).toBe(true)
  })

  it('accepts organization with parentId', () => {
    const result = OrganizationCreateSchema.safeParse({
      name: 'Engineering Dept',
      kind: 'DEPARTMENT',
      parentId: VALID_ID,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid kind', () => {
    const result = OrganizationCreateSchema.safeParse({ name: 'HQ', kind: 'BRANCH' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = OrganizationCreateSchema.safeParse({ name: '', kind: 'HQ' })
    expect(result.success).toBe(false)
  })
})

describe('OrganizationUpdateSchema', () => {
  it('accepts id with partial fields', () => {
    const result = OrganizationUpdateSchema.safeParse({ id: VALID_ID, name: 'Renamed HQ' })
    expect(result.success).toBe(true)
  })

  it('rejects missing id', () => {
    const result = OrganizationUpdateSchema.safeParse({ name: 'No ID' })
    expect(result.success).toBe(false)
  })
})

describe('ProjectCreateSchema', () => {
  it('accepts valid project', () => {
    const result = ProjectCreateSchema.safeParse({
      code: 'PROJ-001',
      name: 'Cloud Migration',
      ownerHqId: VALID_ID,
      budgetAmount: '500000.0000',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid budgetAmount format', () => {
    const result = ProjectCreateSchema.safeParse({
      code: 'PROJ-002',
      name: 'Test',
      ownerHqId: VALID_ID,
      budgetAmount: 'not-a-number',
    })
    expect(result.success).toBe(false)
  })
})

describe('PersonnelCreateSchema', () => {
  it('accepts valid personnel', () => {
    const result = PersonnelCreateSchema.safeParse({
      name: 'Jane Doe',
      homeHqId: VALID_ID,
      costCategoryId: VALID_ID,
    })
    expect(result.success).toBe(true)
  })
})

describe('CostCategoryCreateSchema', () => {
  it('accepts valid cost category', () => {
    const result = CostCategoryCreateSchema.safeParse({ code: 'LABOR-01', kind: 'LABOR' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid kind', () => {
    const result = CostCategoryCreateSchema.safeParse({ code: 'X', kind: 'DIRECT' })
    expect(result.success).toBe(false)
  })
})

describe('StandardRateCreateSchema', () => {
  it('accepts valid rate without effectiveTo', () => {
    const result = StandardRateCreateSchema.safeParse({
      scope: 'PERSONNEL',
      targetId: VALID_ID,
      amount: '125.0000',
      effectiveFrom: VALID_DATE,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid scope', () => {
    const result = StandardRateCreateSchema.safeParse({
      scope: 'DEPARTMENT',
      targetId: VALID_ID,
      amount: '125.0000',
      effectiveFrom: VALID_DATE,
    })
    expect(result.success).toBe(false)
  })
})
