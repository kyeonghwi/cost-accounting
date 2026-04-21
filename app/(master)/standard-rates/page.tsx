'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { StandardRateCreateSchema } from '@/lib/zod/master'
import { logAudit } from '@/lib/audit'
import type { CostCategory, Organization, Personnel, StandardRate } from '@prisma/client'

async function createStandardRate(formData: FormData) {
  'use server'
  const raw = {
    scope: formData.get('scope'),
    targetId: formData.get('targetId'),
    amount: formData.get('amount'),
    effectiveFrom: formData.get('effectiveFrom'),
    effectiveTo: formData.get('effectiveTo') || undefined,
  }
  const result = StandardRateCreateSchema.safeParse(raw)
  if (!result.success) return
  const rate = await prisma.standardRate.create({ data: result.data })
  await logAudit(prisma, 'StandardRate', 'CREATE', rate.id, undefined, result.data)
  revalidatePath('/standard-rates')
}

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

export default async function StandardRatesPage() {
  let rates: StandardRate[] = []
  let personnel: Personnel[] = []
  let categories: CostCategory[] = []
  let allOrgs: Organization[] = []
  try {
    rates = await prisma.standardRate.findMany({ orderBy: { effectiveFrom: 'desc' } })
    personnel = await prisma.personnel.findMany({ orderBy: { name: 'asc' } })
    categories = await prisma.costCategory.findMany({ orderBy: { code: 'asc' } })
    allOrgs = await prisma.organization.findMany({ orderBy: { name: 'asc' } })
  } catch {
    // DB not available
  }

  const personnelMap = new Map(personnel.map((p) => [p.id, p.name]))
  const categoryMap = new Map(categories.map((c) => [c.id, c.code]))
  const orgMap = new Map(allOrgs.map((o) => [o.id, o.name]))

  function targetLabel(scope: string, targetId: string) {
    if (scope === 'PERSONNEL') return personnelMap.get(targetId) ?? targetId
    if (scope === 'CATEGORY') return categoryMap.get(targetId) ?? orgMap.get(targetId) ?? targetId
    return targetId
  }

  return (
    <div data-testid="standard-rates-page">
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">Standard Rates</h1>

      <form action={createStandardRate} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">New Standard Rate</h2>
        <div className="flex flex-wrap gap-3">
          <select name="scope" required className={INPUT_CLASS}>
            <option value="">Scope…</option>
            <option value="PERSONNEL">Personnel</option>
            <option value="CATEGORY">Category</option>
          </select>
          <select name="targetId" required className={INPUT_CLASS}>
            <option value="">Target…</option>
            <optgroup label="Personnel">
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </optgroup>
            <optgroup label="Category">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.code}</option>
              ))}
            </optgroup>
          </select>
          <input name="amount" required placeholder="Rate (e.g. 75.0000)" inputMode="decimal" className={`w-36 ${INPUT_CLASS}`} />
          <input name="effectiveFrom" required type="datetime-local" className={INPUT_CLASS} />
          <input name="effectiveTo" type="datetime-local" className={INPUT_CLASS} />
        </div>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
          Create
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>Scope</th>
            <th className={`${TH_CLASS} pr-4`}>Target</th>
            <th className={`${TH_CLASS} pr-4`}>Rate</th>
            <th className={`${TH_CLASS} pr-4`}>From</th>
            <th className={TH_CLASS}>To</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 text-text-2">{r.scope}</td>
              <td className="py-2.5 pr-4 font-medium text-text-1">{targetLabel(r.scope, r.targetId)}</td>
              <td className="py-2.5 pr-4 tabular-nums text-text-2">{r.amount.toString()}</td>
              <td className="py-2.5 pr-4 tabular-nums text-xs text-text-2">{r.effectiveFrom.toISOString().slice(0, 10)}</td>
              <td className="py-2.5 tabular-nums text-xs text-text-3">{r.effectiveTo?.toISOString().slice(0, 10) ?? '—'}</td>
            </tr>
          ))}
          {rates.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-xs text-text-3 italic">No rates yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
