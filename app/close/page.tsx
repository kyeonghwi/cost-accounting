// @AX:NOTE: [AUTO] page queries DB directly via prisma — if close logic grows, move DB reads into a dedicated query function in lib/close/
// @AX:TODO: [AUTO] ClosePage has no test; consider an E2E or server component integration test covering the empty-history and populated-history paths
import { prisma } from '@/lib/prisma'
import { getCloseHistory } from './actions'
import { CloseForm } from './CloseForm'

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('ko-KR', { month: 'long', year: 'numeric' })
}

export default async function ClosePage() {
  const [openPeriods, history] = await Promise.all([
    prisma.period.findMany({
      where: { status: 'OPEN' },
      orderBy: { yearMonth: 'desc' },
    }),
    getCloseHistory(),
  ])

  return (
    <div data-testid="close-page" className="mx-auto max-w-3xl px-8 py-10 space-y-12">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">
          월 마감
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.06em] text-text-3">
          간접비 배부 · 기간 잠금
        </p>
      </div>

      <CloseForm openPeriods={openPeriods} />

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
          최근 실행
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-text-3 italic">실행 내역이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">날짜</th>
                <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">기간</th>
                <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">방법</th>
                <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">상태</th>
              </tr>
            </thead>
            <tbody>
              {history.map((run) => (
                <tr key={run.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                  <td className="py-2.5 tabular-nums text-xs text-text-2">
                    {run.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-2.5 font-medium text-text-1">{formatYearMonth(run.period.yearMonth)}</td>
                  <td className="py-2.5 text-text-2">{run.method}</td>
                  <td className="py-2.5">
                    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                      run.period.status === 'CLOSED'
                        ? 'bg-accent-dim text-accent'
                        : 'bg-surface-alt text-text-2'
                    }`}>
                      {run.period.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
