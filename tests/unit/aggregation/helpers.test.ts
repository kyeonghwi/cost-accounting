import { describe, it, expect } from 'vitest'
import { resolveHqId } from '../../../lib/aggregation/_helpers'

// OrgKind enum values as used by Prisma — must match the generated client
const OrgKind = {
  HQ: 'HQ',
  DEPARTMENT: 'DEPARTMENT',
  ENTERPRISE: 'ENTERPRISE',
} as const

describe('resolveHqId', () => {
  it('HQ org — returns own id', () => {
    const org = { id: 'hq-1', kind: OrgKind.HQ as any, parentId: null }
    expect(resolveHqId(org)).toBe('hq-1')
  })

  it('DEPARTMENT with parentId — returns parentId', () => {
    const org = { id: 'dept-1', kind: OrgKind.DEPARTMENT as any, parentId: 'hq-99' }
    expect(resolveHqId(org)).toBe('hq-99')
  })

  it('DEPARTMENT with null parentId — returns null', () => {
    const org = { id: 'dept-2', kind: OrgKind.DEPARTMENT as any, parentId: null }
    expect(resolveHqId(org)).toBeNull()
  })

  it('ENTERPRISE — returns null regardless of parentId', () => {
    const org = { id: 'ent-1', kind: OrgKind.ENTERPRISE as any, parentId: null }
    expect(resolveHqId(org)).toBeNull()
  })

  it('ENTERPRISE with non-null parentId — still returns null', () => {
    const org = { id: 'ent-2', kind: OrgKind.ENTERPRISE as any, parentId: 'some-parent' }
    expect(resolveHqId(org)).toBeNull()
  })
})
