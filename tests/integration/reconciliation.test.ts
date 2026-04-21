import { describe, it, expect, vi } from 'vitest'
import { PrismaClient, OrgKind } from '@prisma/client'
import { aggregatePersonnel } from '../../lib/aggregation/personnel'
import { aggregateProject } from '../../lib/aggregation/project'
import { aggregateHq } from '../../lib/aggregation/hq'
import { aggregateEnterprise } from '../../lib/aggregation/enterprise'

/**
 * Fixture:
 *   P1 → 1000.0000 on Project A, HomeHQ = HQ1 (kind=HQ)
 *   P2 → 2000.0000 on Project B, HomeHQ = HQ1 (kind=HQ)
 *   P3 →  500.0000 on Project A, HomeHQ = DEPT1 (kind=DEPARTMENT, parentId=HQ1)
 *   Total = 3500.0000
 */

const PERIOD = 'period-test'

const personnelGroupByRows = [
  { personnelId: 'p1', _sum: { amount: '1000.0000' } },
  { personnelId: 'p2', _sum: { amount: '2000.0000' } },
  { personnelId: 'p3', _sum: { amount: '500.0000' } },
]

const projectGroupByRows = [
  { projectId: 'proj-a', _sum: { amount: '1500.0000' } },
  { projectId: 'proj-b', _sum: { amount: '2000.0000' } },
]

const findManyRows = [
  {
    amount: '1000.0000',
    personnel: {
      homeHq: { id: 'hq1', kind: OrgKind.HQ, parentId: null },
    },
  },
  {
    amount: '2000.0000',
    personnel: {
      homeHq: { id: 'hq1', kind: OrgKind.HQ, parentId: null },
    },
  },
  {
    amount: '500.0000',
    personnel: {
      homeHq: { id: 'dept1', kind: OrgKind.DEPARTMENT, parentId: 'hq1' },
    },
  },
]

const mockPrisma = {
  costEntry: {
    groupBy: vi.fn().mockImplementation(({ by }: { by: string[] }) => {
      if (by[0] === 'personnelId') return Promise.resolve(personnelGroupByRows)
      if (by[0] === 'projectId') return Promise.resolve(projectGroupByRows)
      return Promise.resolve([])
    }),
    aggregate: vi.fn().mockResolvedValue({ _sum: { amount: '3500.0000' } }),
    findMany: vi.fn().mockResolvedValue(findManyRows),
  },
} as unknown as PrismaClient

describe('reconciliation: all dimensions sum to the same total', () => {
  it('personnel total equals enterprise total', async () => {
    const [personnel, enterprise] = await Promise.all([
      aggregatePersonnel(mockPrisma, PERIOD),
      aggregateEnterprise(mockPrisma, PERIOD),
    ])
    const personnelTotal = personnel.reduce((s, r) => s + Number(r.total), 0)
    expect(personnelTotal).toBeCloseTo(Number(enterprise.total), 2)
  })

  it('project total equals enterprise total', async () => {
    const [projects, enterprise] = await Promise.all([
      aggregateProject(mockPrisma, PERIOD),
      aggregateEnterprise(mockPrisma, PERIOD),
    ])
    const projectTotal = projects.reduce((s, r) => s + Number(r.total), 0)
    expect(projectTotal).toBeCloseTo(Number(enterprise.total), 2)
  })

  it('hq total equals enterprise total', async () => {
    const [hqs, enterprise] = await Promise.all([
      aggregateHq(mockPrisma, PERIOD),
      aggregateEnterprise(mockPrisma, PERIOD),
    ])
    const hqTotal = hqs.reduce((s, r) => s + Number(r.total), 0)
    expect(hqTotal).toBeCloseTo(Number(enterprise.total), 2)
  })

  it('all four dimensions equal 3500', async () => {
    const [personnel, projects, hqs, enterprise] = await Promise.all([
      aggregatePersonnel(mockPrisma, PERIOD),
      aggregateProject(mockPrisma, PERIOD),
      aggregateHq(mockPrisma, PERIOD),
      aggregateEnterprise(mockPrisma, PERIOD),
    ])
    const personnelTotal = personnel.reduce((s, r) => s + Number(r.total), 0)
    const projectTotal = projects.reduce((s, r) => s + Number(r.total), 0)
    const hqTotal = hqs.reduce((s, r) => s + Number(r.total), 0)
    const enterpriseTotal = Number(enterprise.total)

    expect(personnelTotal).toBeCloseTo(3500, 2)
    expect(projectTotal).toBeCloseTo(3500, 2)
    expect(hqTotal).toBeCloseTo(3500, 2)
    expect(enterpriseTotal).toBeCloseTo(3500, 2)
  })
})
