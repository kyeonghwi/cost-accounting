import { PrismaClient } from '@prisma/client'
import type { ProjectAggregation } from './types'

export async function aggregateProject(
  prisma: PrismaClient,
  periodId: string,
): Promise<ProjectAggregation[]> {
  const rows = await prisma.costEntry.groupBy({
    by: ['projectId'],
    where: { periodId },
    _sum: { amount: true },
  })
  return rows.map(r => ({
    projectId: r.projectId,
    total: (r._sum.amount ?? '0').toString(),
  }))
}
