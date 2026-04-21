'use server'

// @AX:ANCHOR: [AUTO] server action boundary — closeAction and getCloseHistory are Next.js server actions; callers: ClosePage (page.tsx); do not change signatures without updating callers
import { AllocationMethod } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { runCloseWorkflow } from '@/lib/close/workflow'
import type { CloseResult } from '@/lib/close/workflow'

export type CloseActionState =
  | { ok: true; result: CloseResult }
  | { ok: false; error: string }

/**
 * Server action: runs the monthly close workflow for a period.
 * Reads periodId and method from form data.
 */
export async function closeAction(formData: FormData): Promise<CloseActionState> {
  const periodId = formData.get('periodId')
  const methodRaw = formData.get('method')

  if (typeof periodId !== 'string' || !periodId) {
    return { ok: false, error: 'periodId is required' }
  }

  const method =
    methodRaw === 'STEP_DOWN' ? AllocationMethod.STEP_DOWN : AllocationMethod.DIRECT

  try {
    const result = await runCloseWorkflow(prisma, periodId, method)
    return { ok: true, result }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

// @AX:TODO: [AUTO] closeAction has no integration test covering the error path (period not found, already CLOSED)
// @AX:CYCLE:1
/**
 * Returns the last 10 AllocationRun rows, newest first.
 */
export async function getCloseHistory() {
  // @AX:NOTE: [AUTO] magic constant — take: 10 caps history display; increase if UI needs paginated history
  return prisma.allocationRun.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      period: { select: { yearMonth: true, status: true } },
    },
  })
}
