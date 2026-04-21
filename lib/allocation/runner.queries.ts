import type { PrismaClient } from '@prisma/client'
import { AllocationMethod, OrgKind } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import type { Pool } from './stepDown'
import type { DirectTarget, AllocationKey } from './direct'

interface RuleRow {
  poolOrgId: string
  allocationKey: AllocationKey
  method: AllocationMethod
  sequence: number | null
}

/**
 * Load all allocation rules ordered by (sequence asc, poolOrgId asc).
 * Stable order is required for deterministic input checksums.
 */
export async function loadAllocationRules(prisma: PrismaClient): Promise<RuleRow[]> {
  const rows = await prisma.allocationRule.findMany({
    orderBy: [{ sequence: 'asc' }, { poolOrgId: 'asc' }],
  })
  return rows.map((r) => ({
    poolOrgId: r.poolOrgId,
    allocationKey: r.allocationKey as AllocationKey,
    method: r.method,
    sequence: r.sequence,
  }))
}

/**
 * Sum cost-entry amounts grouped by the home HQ of the charging personnel
 * within the period, restricted to rule-declared pool orgs. Returned in
 * deterministic orgId-sorted order.
 */
export async function loadPoolAmounts(
  prisma: PrismaClient,
  periodId: string,
): Promise<Pool[]> {
  const rules = await prisma.allocationRule.findMany({
    select: { poolOrgId: true },
  })
  const poolOrgIds = Array.from(new Set(rules.map((r) => r.poolOrgId))).sort()

  const pools: Pool[] = []
  for (const orgId of poolOrgIds) {
    const agg = await prisma.costEntry.aggregate({
      _sum: { amount: true },
      where: {
        periodId,
        personnel: { homeHqId: orgId },
      },
    })
    const amount = agg._sum?.amount ?? new Decimal(0)
    pools.push({ orgId, amount })
  }
  return pools
}

/**
 * Load operating-department projects (those whose owning HQ is a DEPARTMENT)
 * with per-period weight metrics (headcount, direct labor hours, direct cost).
 * Returned sorted by projectId for deterministic ordering.
 */
export async function loadOperatingTargets(
  prisma: PrismaClient,
  periodId: string,
): Promise<DirectTarget[]> {
  const projects = await prisma.project.findMany({
    where: {
      ownerHq: { kind: OrgKind.DEPARTMENT },
    },
    orderBy: { id: 'asc' },
    select: { id: true, ownerHqId: true },
  })

  const targets: DirectTarget[] = []
  for (const project of projects) {
    const [headcountAgg, costAgg] = await Promise.all([
      prisma.personnel.count({ where: { homeHqId: project.ownerHqId } }),
      prisma.costEntry.aggregate({
        _sum: { hours: true, amount: true },
        where: { projectId: project.id, periodId },
      }),
    ])
    targets.push({
      projectId: project.id,
      headcount: headcountAgg,
      directLaborHours: costAgg._sum?.hours ?? new Decimal(0),
      directCost: costAgg._sum?.amount ?? new Decimal(0),
    })
  }
  return targets
}
