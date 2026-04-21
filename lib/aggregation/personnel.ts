import { PrismaClient } from '@prisma/client'
import type { PersonnelAggregation } from './types'

export async function aggregatePersonnel(
  prisma: PrismaClient,
  periodId: string,
): Promise<PersonnelAggregation[]> {
  const rows = await prisma.costEntry.groupBy({
    by: ['personnelId'],
    where: { periodId },
    _sum: { amount: true },
  })
  return rows.map(r => ({
    personnelId: r.personnelId,
    total: (r._sum.amount ?? '0').toString(),
  }))
}
