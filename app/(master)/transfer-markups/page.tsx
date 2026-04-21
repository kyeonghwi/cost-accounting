'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { idField, decimalString, dateTimeField } from '@/lib/zod/_shared'
import type { Organization, TransferMarkup } from '@prisma/client'

const TransferMarkupCreateSchema = z.object({
  fromHqId: idField,
  toHqId: idField,
  markupPct: decimalString,
  effectiveFrom: dateTimeField,
  effectiveTo: dateTimeField.optional(),
})

type MarkupWithOrgs = TransferMarkup & { fromHq: Organization; toHq: Organization }

async function createTransferMarkup(formData: FormData) {
  'use server'
  const raw = {
    fromHqId: formData.get('fromHqId'),
    toHqId: formData.get('toHqId'),
    markupPct: formData.get('markupPct'),
    effectiveFrom: formData.get('effectiveFrom'),
    effectiveTo: formData.get('effectiveTo') || undefined,
  }
  const result = TransferMarkupCreateSchema.safeParse(raw)
  if (!result.success) return
  const markup = await prisma.transferMarkup.create({ data: result.data })
  await logAudit(prisma, 'TransferMarkup', 'CREATE', markup.id, undefined, result.data)
  revalidatePath('/transfer-markups')
}

export default async function TransferMarkupsPage() {
  let markups: MarkupWithOrgs[] = []
  let hqOrgs: Organization[] = []
  try {
    markups = await prisma.transferMarkup.findMany({
      orderBy: { effectiveFrom: 'desc' },
      include: { fromHq: true, toHq: true },
    })
    hqOrgs = await prisma.organization.findMany({
      where: { kind: 'HQ' },
      orderBy: { name: 'asc' },
    })
  } catch {
    // DB not available
  }

  return (
    <div data-testid="transfer-markups-page">
      <h1 className="mb-4 text-xl font-semibold">Transfer Markups</h1>

      <form action={createTransferMarkup} className="mb-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">New Transfer Markup</h2>
        <div className="flex flex-wrap gap-3">
          <select name="fromHqId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">From HQ…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select name="toHqId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">To HQ…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            name="markupPct"
            required
            placeholder="Markup % (e.g. 0.15)"
            inputMode="decimal"
            className="w-40 rounded border border-gray-300 px-3 py-1.5 text-sm"
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
            <th className="py-2 pr-4">From HQ</th>
            <th className="py-2 pr-4">To HQ</th>
            <th className="py-2 pr-4">Markup %</th>
            <th className="py-2 pr-4">From</th>
            <th className="py-2">To</th>
          </tr>
        </thead>
        <tbody>
          {markups.map((m) => (
            <tr key={m.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{m.fromHq.name}</td>
              <td className="py-2 pr-4">{m.toHq.name}</td>
              <td className="py-2 pr-4">{m.markupPct.toString()}</td>
              <td className="py-2 pr-4">{m.effectiveFrom.toISOString().slice(0, 10)}</td>
              <td className="py-2 text-gray-500">{m.effectiveTo?.toISOString().slice(0, 10) ?? '—'}</td>
            </tr>
          ))}
          {markups.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-400">
                No transfer markups yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
