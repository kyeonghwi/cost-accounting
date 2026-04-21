import { PrismaClient } from '@prisma/client'
import type { EnterpriseAggregation } from './types'

export async function aggregateEnterprise(
  prisma: PrismaClient,
  periodId: string,
): Promise<EnterpriseAggregation> {
  const agg = await prisma.costEntry.aggregate({
    where: { periodId },
    _sum: { amount: true },
  })
  return { total: (agg._sum.amount ?? '0').toString() }
}
