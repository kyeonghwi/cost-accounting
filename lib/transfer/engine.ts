import { Decimal } from '@prisma/client/runtime/library'
import { resolveMarkup } from './rate'
import type { TransferMarkupRecord } from './rate'

// Flat CostEntry shape consumed by the engine.
// No Prisma imports — this is a pure computation layer.
export interface CostEntry {
  id: string
  personnelId: string
  personnelHomeHqId: string
  projectId: string
  projectOwnerHqId: string
  date: Date
  hours: Decimal
  standardHourlyRate: Decimal
  periodId: string
}

export interface TransferEntry {
  fromHqId: string
  toHqId: string
  personnelId: string
  hours: Decimal
  standardRate: Decimal
  markupPct: Decimal
  amount: Decimal
  direction: 'CREDIT' | 'CHARGE'
}

/**
 * Computes CREDIT + CHARGE TransferEntry pairs for every cross-HQ CostEntry.
 *
 * Rules:
 *  - Same-HQ entries are skipped (no transfer).
 *  - amount = hours × standardHourlyRate × (1 + markupPct)
 *  - One CREDIT entry (home HQ receives credit) and one CHARGE entry (project HQ is charged).
 *  - Throws if no markup row exists for the cross-HQ pair (REQ-TP-03).
 *  - Symmetry guaranteed: sum(CREDIT.amount) === sum(CHARGE.amount).
 */
export function computeTransferEntries(
  entries: CostEntry[],
  markups: TransferMarkupRecord[],
): TransferEntry[] {
  const result: TransferEntry[] = []

  for (const entry of entries) {
    const { personnelHomeHqId: homeHqId, projectOwnerHqId: ownerHqId } = entry

    if (homeHqId === ownerHqId) {
      continue
    }

    const markupPct = resolveMarkup(homeHqId, ownerHqId, markups)
    const multiplier = new Decimal('1').plus(markupPct)
    const amount = entry.hours.times(entry.standardHourlyRate).times(multiplier)

    const shared = {
      fromHqId: homeHqId,
      toHqId: ownerHqId,
      personnelId: entry.personnelId,
      hours: entry.hours,
      standardRate: entry.standardHourlyRate,
      markupPct,
      amount,
    }

    result.push({ ...shared, direction: 'CREDIT' })
    result.push({ ...shared, direction: 'CHARGE' })
  }

  return result
}
