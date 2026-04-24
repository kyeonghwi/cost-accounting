import { Decimal } from '@prisma/client/runtime/library'
import { decomposeVariance } from '../variance/decompose'
import type { PeriodData } from '../variance/decompose'

// Minimal subset of the transaction client needed by this helper.
// Accepting a narrow type avoids depending on the full PrismaClient shape and
// makes the guard in workflow.ts structurally simple.
export interface VarianceTx {
  costEntry: {
    findMany: (args: {
      where: { periodId: string }
      select: object
    }) => Promise<CostEntryRow[]>
  }
  varianceSnapshot: {
    createMany: (args: { data: SnapshotRow[] }) => Promise<{ count: number }>
  }
  period: {
    findFirst: (args: {
      where: { status: string; NOT: { id: string } }
      orderBy: { yearMonth: string }
    }) => Promise<{ id: string } | null>
    update: unknown
  }
}

interface CostEntryRow {
  hours: Decimal
  amount: Decimal
  personnel: {
    homeHqId: string
    homeHq?: { name: string }
  }
}

interface SnapshotRow {
  periodId: string
  scope: string
  priceEffect: Decimal
  volumeEffect: Decimal
  mixEffect: Decimal
  efficiencyEffect: Decimal
  residual: Decimal
}

function toPeriodData(revenue: Decimal, volume: Decimal): PeriodData {
  const zero = new Decimal(0)
  if (volume.isZero()) {
    return { revenue: zero, volume: zero, unitPrice: zero, unitCost: zero, mix: new Decimal(1) }
  }
  const unitPrice = revenue.dividedBy(volume)
  return { revenue, volume, unitPrice, unitCost: unitPrice, mix: new Decimal(1) }
}

/**
 * Aggregates CostEntry rows for the current period by HQ, finds the previous
 * CLOSED period for budget comparison, decomposes variance, and inserts
 * VarianceSnapshot rows — one per HQ plus one enterprise-level row.
 *
 * Returns the total number of rows created (HQ count + 1 for enterprise).
 * Returns 0 when there are no cost entries for the period.
 */
export async function createVarianceSnapshots(tx: VarianceTx, periodId: string): Promise<number> {
  const currentEntries = await tx.costEntry.findMany({
    where: { periodId },
    select: {
      hours: true,
      amount: true,
      personnel: { select: { homeHqId: true, homeHq: { select: { name: true } } } },
    },
  }) as CostEntryRow[]

  if (currentEntries.length === 0) return 0

  // Aggregate current period by hqId
  const hqCur = new Map<string, { name: string; revenue: Decimal; volume: Decimal }>()
  let entRev = new Decimal(0)
  let entVol = new Decimal(0)

  for (const e of currentEntries) {
    const { homeHqId: hqId, homeHq } = e.personnel
    const name = homeHq?.name ?? hqId
    const prev = hqCur.get(hqId) ?? { name, revenue: new Decimal(0), volume: new Decimal(0) }
    hqCur.set(hqId, { name, revenue: prev.revenue.plus(e.amount), volume: prev.volume.plus(e.hours) })
    entRev = entRev.plus(e.amount)
    entVol = entVol.plus(e.hours)
  }

  // Find most recent previous CLOSED period for budget baseline (REQ-PIPE-02)
  const prevPeriod = await tx.period.findFirst({
    where: { status: 'CLOSED', NOT: { id: periodId } },
    orderBy: { yearMonth: 'desc' },
  })

  const hqPrev = new Map<string, { revenue: Decimal; volume: Decimal }>()
  let prevEntRev = new Decimal(0)
  let prevEntVol = new Decimal(0)

  if (prevPeriod) {
    const prevEntries = await tx.costEntry.findMany({
      where: { periodId: prevPeriod.id },
      select: { hours: true, amount: true, personnel: { select: { homeHqId: true } } },
    }) as CostEntryRow[]

    for (const e of prevEntries) {
      const hqId = e.personnel.homeHqId
      const p = hqPrev.get(hqId) ?? { revenue: new Decimal(0), volume: new Decimal(0) }
      hqPrev.set(hqId, { revenue: p.revenue.plus(e.amount), volume: p.volume.plus(e.hours) })
      prevEntRev = prevEntRev.plus(e.amount)
      prevEntVol = prevEntVol.plus(e.hours)
    }
  }

  const rows: SnapshotRow[] = []

  // HQ-level rows (REQ-PIPE-03: scope = Organization.name)
  for (const [hqId, cur] of hqCur) {
    const actual = toPeriodData(cur.revenue, cur.volume)
    const prevAgg = hqPrev.get(hqId)
    const budget = prevAgg ? toPeriodData(prevAgg.revenue, prevAgg.volume) : toPeriodData(new Decimal(0), new Decimal(0))
    const c = decomposeVariance(actual, budget, actual)
    rows.push({
      periodId,
      scope: cur.name,
      priceEffect: c.priceEffect,
      volumeEffect: c.volumeEffect,
      mixEffect: c.mixEffect,
      efficiencyEffect: c.efficiencyEffect,
      residual: c.residual,
    })
  }

  // Enterprise-level aggregate row (REQ-PIPE-03: scope = 'enterprise')
  const entActual = toPeriodData(entRev, entVol)
  const entBudget = toPeriodData(prevEntRev, prevEntVol)
  const ec = decomposeVariance(entActual, entBudget, entActual)
  rows.push({
    periodId,
    scope: 'enterprise',
    priceEffect: ec.priceEffect,
    volumeEffect: ec.volumeEffect,
    mixEffect: ec.mixEffect,
    efficiencyEffect: ec.efficiencyEffect,
    residual: ec.residual,
  })

  await tx.varianceSnapshot.createMany({ data: rows })
  return rows.length
}
