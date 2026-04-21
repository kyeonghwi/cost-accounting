import type { PrismaClient } from '@prisma/client'

// @AX:ANCHOR: [AUTO] public audit API — called from organizations, projects, personnel, standard-rates, transfer-markups, and cost-entries pages; signature changes require coordinated updates across all callers
// @AX:WARN: [AUTO] silent catch swallows all audit failures — audit loss is undetectable at runtime; consider a dead-letter queue or metric counter if compliance requires audit completeness guarantees

/**
 * Write a record to AuditLog. No-ops gracefully if the table is unavailable.
 */
export async function logAudit(
  prisma: PrismaClient,
  table: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  recordId: string,
  before?: object,
  after?: object,
  actorPersona = 'system',
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: table,
        entityId: recordId,
        action,
        before: before ?? undefined,
        after: after ?? undefined,
        actorPersona,
      },
    })
  } catch {
    // Silently no-op — audit failure must never break the primary operation
  }
}
