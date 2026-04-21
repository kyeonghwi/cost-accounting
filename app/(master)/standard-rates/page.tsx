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

  // Build a map for display labels
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
      <h1 className="mb-4 text-xl font-semibold">Standard Rates</h1>

      <form action={createStandardRate} className="mb-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">New Standard Rate</h2>
        <div className="flex flex-wrap gap-3">
          <select name="scope" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Scope…</option>
            <option value="PERSONNEL">Personnel</option>
            <option value="CATEGORY">Category</option>
          </select>
          <select name="targetId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Target…</option>
            <optgroup label="Personnel">
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Category">
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                </option>
              ))}
            </optgroup>
          </select>
          <input
            name="amount"
            required
            placeholder="Rate (e.g. 75.0000)"
            inputMode="decimal"
            className="w-36 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            name="effectiveFrom"
            required
            type="datetime-local"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            name="effectiveTo"
            type="datetime-local"
            className="rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
          Create
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">Scope</th>
            <th className="py-2 pr-4">Target</th>
            <th className="py-2 pr-4">Rate</th>
            <th className="py-2 pr-4">From</th>
            <th className="py-2">To</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{r.scope}</td>
              <td className="py-2 pr-4">{targetLabel(r.scope, r.targetId)}</td>
              <td className="py-2 pr-4">{r.amount.toString()}</td>
              <td className="py-2 pr-4">{r.effectiveFrom.toISOString().slice(0, 10)}</td>
              <td className="py-2 text-gray-500">{r.effectiveTo?.toISOString().slice(0, 10) ?? '—'}</td>
            </tr>
          ))}
          {rates.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-400">
                No rates yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
