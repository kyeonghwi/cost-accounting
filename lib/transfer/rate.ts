import { Decimal } from '@prisma/client/runtime/library'

// Minimal markup descriptor used by the engine.
// Callers may pre-filter by date before passing markups in.
export interface TransferMarkupRecord {
  fromHqId: string
  toHqId: string
  markupPct: Decimal
}

/**
 * Resolves the transfer markup fraction for a given HQ pair.
 * markupPct is a fractional value (e.g., 0.15 means 15%).
 * Throws if no matching row is found (REQ-TP-03: fail loud for missing config).
 */
// @AX:TODO: [AUTO] no unit test for the missing-markup throw path; REQ-TP-03 requires fail-loud behaviour but the error message format is untested and could silently regress
export function resolveMarkup(
  fromHqId: string,
  toHqId: string,
  markups: TransferMarkupRecord[],
): Decimal {
  const match = markups.find(
    (m) => m.fromHqId === fromHqId && m.toHqId === toHqId,
  )
  if (!match) {
    throw new Error(
      `No transfer markup configured for pair ${fromHqId} → ${toHqId}`,
    )
  }
  return match.markupPct
}
