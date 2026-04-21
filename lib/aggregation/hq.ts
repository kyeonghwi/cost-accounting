import { Prisma, PrismaClient } from '@prisma/client'
import type { HqAggregation } from './types'
import { resolveHqId } from './_helpers'

export async function aggregateHq(
  prisma: PrismaClient,
  periodId: string,
): Promise<HqAggregation[]> {
  const entries = await prisma.costEntry.findMany({
    where: { periodId },
    select: {
      amount: true,
      personnel: {
        select: {
          homeHq: {
            select: { id: true, kind: true, parentId: true },
          },
        },
      },
    },
  })

  const totals = new Map<string, Prisma.Decimal>()

  for (const entry of entries) {
    const org = entry.personnel.homeHq
    const hqId = resolveHqId(org)
    if (hqId === null) continue

    const prev = totals.get(hqId) ?? new Prisma.Decimal('0')
    totals.set(hqId, prev.plus(new Prisma.Decimal(entry.amount.toString())))
  }

  return Array.from(totals.entries()).map(([hqId, total]) => ({
    hqId,
    total: total.toString(),
  }))
}
