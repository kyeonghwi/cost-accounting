import { prisma } from '@/lib/prisma'
import type { CostEntry, Personnel, StandardRate } from '@prisma/client'

type Props = { params: Promise<{ id: string }> }

export default async function PersonnelDetailPage({ params }: Props) {
  const { id } = await params

  let person: Personnel | null = null
  let rate: StandardRate | null = null
  let entries: CostEntry[] = []

  try {
    person = await prisma.personnel.findUnique({ where: { id } })
    if (person) {
      // @AX:ANCHOR: [AUTO] rate lookup by scope=PERSONNEL + desc effectiveFrom — mirrors resolveRate priority order in actions.ts; keep in sync
      rate = await prisma.standardRate.findFirst({
        where: { scope: 'PERSONNEL', targetId: id },
        orderBy: { effectiveFrom: 'desc' },
      })
      // @AX:NOTE: [AUTO] magic constant — take: 10 caps recent entries; increase if UX requires more history
      entries = await prisma.costEntry.findMany({
        where: { personnelId: id },
        orderBy: { date: 'desc' },
        take: 10,
      })
    }
  } catch { /* DB not available in build */ }

  if (!person) {
    return <div className="p-8 text-sm text-text-3 italic">인원을 찾을 수 없습니다.</div>
  }

  return (
    <div data-testid="personnel-detail" className="p-8">
      <h1 className="mb-6 font-display text-2xl font-semibold tracking-tight text-text-1">
        인원 상세
      </h1>

      <dl className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-text-3">이름</dt>
          <dd>
            <span data-testid="personnel-name" className="font-medium text-text-1">
              {person.name}
            </span>
          </dd>
        </div>
        <div>
          <dt className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-text-3">
            표준 시간당 단가
          </dt>
          <dd>
            <span data-testid="personnel-standard-rate" className="tabular-nums text-text-1">
              {rate ? `$${Number(rate.amount).toFixed(2)}/시간` : '등록된 단가 없음'}
            </span>
          </dd>
        </div>
      </dl>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
        최근 비용 항목
      </h2>
      {entries.length === 0 ? (
        <p className="text-sm text-text-3 italic">비용 항목이 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong">
              <th className="pb-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">날짜</th>
              <th className="pb-2.5 pr-4 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">시간</th>
              <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">금액</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                <td className="py-2.5 pr-4 tabular-nums text-xs text-text-2">
                  {new Date(e.date).toLocaleDateString('ko-KR')}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-text-2">{Number(e.hours).toFixed(1)}</td>
                <td className="py-2.5 text-right tabular-nums font-medium text-text-1">${Number(e.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
