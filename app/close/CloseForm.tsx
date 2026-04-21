'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { closeAction } from './actions'
import type { CloseActionState } from './actions'
import type { Period } from '@prisma/client'
import { usePersona } from '@/lib/persona'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending && (
        <svg className="animate-spin h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {pending ? 'Running…' : 'Run Close'}
    </button>
  )
}

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

const LABEL_CLASS = 'block text-xs font-semibold uppercase tracking-[0.06em] text-text-3 mb-1.5'
const SELECT_CLASS =
  'w-full border border-border bg-surface rounded px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'

type Props = { openPeriods: Period[] }

export function CloseForm({ openPeriods }: Props) {
  const [state, formAction] = useFormState<CloseActionState, FormData>(closeAction, null)
  const { persona } = usePersona()
  const canClose = persona !== 'viewer'

  return (
    <section>
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
        Run Close
      </h2>

      {state?.ok === true && (
        <div className="mb-5 rounded border border-positive/30 bg-positive-bg px-4 py-3 text-sm text-positive space-y-1">
          <p>
            Period closed. Run ID:{' '}
            <code className="font-mono text-xs bg-white/60 px-1 py-0.5 rounded">
              {state.result.allocationRunId}
            </code>
            {' '}· Transfer entries: {state.result.transferCount}
          </p>
          {state.result.emptyPool && (
            <p className="text-xs" style={{ color: 'var(--color-warn-text)' }}>
              No overhead pool costs found — period closed with zero allocation results.
            </p>
          )}
        </div>
      )}

      {state?.ok === false && (
        <div className="mb-5 rounded border border-negative/30 bg-negative-bg px-4 py-3 text-sm text-negative">
          {state.error}
        </div>
      )}

      {!canClose && (
        <p className="mb-4 text-xs text-text-3 italic">
          Switch to Cost Accountant persona to run a close.
        </p>
      )}

      <form
        action={formAction}
        className={`flex flex-col gap-4 max-w-sm${!canClose ? ' opacity-40 pointer-events-none' : ''}`}
      >
        <div>
          <label htmlFor="periodId" className={LABEL_CLASS}>Period</label>
          <select id="periodId" name="periodId" required className={SELECT_CLASS}>
            <option value="">Select a period</option>
            {openPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {formatYearMonth(p.yearMonth)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="method" className={LABEL_CLASS}>Allocation Method</label>
          <select id="method" name="method" className={SELECT_CLASS}>
            <option value="DIRECT">Direct — distribute pool costs to projects</option>
            <option value="STEP_DOWN">Step-Down — allocate service depts in sequence</option>
          </select>
        </div>

        <SubmitButton />
      </form>
    </section>
  )
}
