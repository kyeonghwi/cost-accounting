'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { closeAction } from './actions'
import type { CloseActionState } from './actions'
import type { Period } from '@prisma/client'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
    >
      {pending && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      )}
      {pending ? 'Running...' : 'Run Close'}
    </button>
  )
}

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

type Props = { openPeriods: Period[] }

export function CloseForm({ openPeriods }: Props) {
  const [state, formAction] = useFormState<CloseActionState, FormData>(closeAction, null)

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3">Run Close</h2>

      {state?.ok === true && (
        <div className="mb-4 rounded bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          Period closed successfully. Run ID: <code className="font-mono">{state.result.allocationRunId}</code>.
          Transfer entries written: {state.result.transferCount}.
        </div>
      )}

      {state?.ok === false && (
        <div className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-4 max-w-sm">
        <div>
          <label htmlFor="periodId" className="block text-sm font-medium mb-1">
            Period
          </label>
          <select
            id="periodId"
            name="periodId"
            required
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="">Select a period</option>
            {openPeriods.map((p) => (
              <option key={p.id} value={p.id}>
                {formatYearMonth(p.yearMonth)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="method" className="block text-sm font-medium mb-1">
            Allocation Method
          </label>
          <select
            id="method"
            name="method"
            className="w-full border rounded px-3 py-2 text-sm"
          >
            <option value="DIRECT">Direct — distribute pool costs to projects</option>
            <option value="STEP_DOWN">Step-Down — allocate service depts in sequence</option>
          </select>
        </div>

        <SubmitButton />
      </form>
    </section>
  )
}
