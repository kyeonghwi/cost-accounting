'use server'

// @AX:ANCHOR: [AUTO] server action boundary — closeAction and getCloseHistory are Next.js server actions; callers: CloseForm (CloseForm.tsx); do not change signatures without updating callers
import { AllocationMethod } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { runCloseWorkflow } from '@/lib/close/workflow'
import type { CloseResult } from '@/lib/close/workflow'

export type CloseActionState =
  | { ok: true; result: CloseResult }
  | { ok: false; error: string }
  | null

const VALID_METHODS: ReadonlyArray<string> = ['DIRECT', 'STEP_DOWN']

/**
 * Server action compatible with useFormState: (prevState, formData) => State.
 * Validates periodId presence and method enum before invoking the workflow.
 */
export async function closeAction(
  _prev: CloseActionState,
  formData: FormData,
): Promise<CloseActionState> {
  const periodId = formData.get('periodId')
  const methodRaw = formData.get('method')

  if (typeof periodId !== 'string' || !periodId) {
    return { ok: false, error: 'Period is required.' }
  }

  if (typeof methodRaw !== 'string' || !VALID_METHODS.includes(methodRaw)) {
    return { ok: false, error: `Invalid allocation method: ${String(methodRaw)}` }
  }

  const method = methodRaw === 'STEP_DOWN' ? AllocationMethod.STEP_DOWN : AllocationMethod.DIRECT

  try {
    const result = await runCloseWorkflow(prisma, periodId, method)
    return { ok: true, result }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, error: message }
  }
}

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
