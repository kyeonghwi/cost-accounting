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

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

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
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">이전 마크업</h1>

      <form action={createTransferMarkup} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">새 이전 마크업</h2>
        <div className="flex flex-wrap gap-3">
          <select name="fromHqId" required className={INPUT_CLASS}>
            <option value="">출발 본부…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select name="toHqId" required className={INPUT_CLASS}>
            <option value="">도착 본부…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input name="markupPct" required placeholder="마크업 % (예: 0.15)" inputMode="decimal" className={`w-40 ${INPUT_CLASS}`} />
          <input name="effectiveFrom" required type="datetime-local" className={INPUT_CLASS} />
          <input name="effectiveTo" type="datetime-local" className={INPUT_CLASS} />
        </div>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
          생성
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>출발 본부</th>
            <th className={`${TH_CLASS} pr-4`}>도착 본부</th>
            <th className={`${TH_CLASS} pr-4`}>마크업 %</th>
            <th className={`${TH_CLASS} pr-4`}>시작일</th>
            <th className={TH_CLASS}>종료일</th>
          </tr>
        </thead>
        <tbody>
          {markups.map((m) => (
            <tr key={m.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 font-medium text-text-1">{m.fromHq.name}</td>
              <td className="py-2.5 pr-4 text-text-2">{m.toHq.name}</td>
              <td className="py-2.5 pr-4 tabular-nums text-text-2">{m.markupPct.toString()}</td>
              <td className="py-2.5 pr-4 tabular-nums text-xs text-text-2">{m.effectiveFrom.toISOString().slice(0, 10)}</td>
              <td className="py-2.5 tabular-nums text-xs text-text-3">{m.effectiveTo?.toISOString().slice(0, 10) ?? '—'}</td>
            </tr>
          ))}
          {markups.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-xs text-text-3 italic">이전 마크업이 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
