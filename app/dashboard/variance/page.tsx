import { prisma } from '@/lib/prisma'
import { VarianceBarChart } from '@/components/charts/VarianceBarChart'
import type { VarianceSnapshot } from '@prisma/client'

function signClass(n: number) {
  if (n > 0) return 'text-positive'
  if (n < 0) return 'text-negative'
  return 'text-text-2'
}

function fmt(n: number) {
  return n.toLocaleString('ko-KR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  })
}

export default async function VarianceDashboard({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  let closedPeriods: Array<{ id: string; yearMonth: string }> = []
  let selectedYearMonth: string | undefined
  let snapshots: VarianceSnapshot[] = []

  try {
    // 1. Get all CLOSED periods for the selector
    closedPeriods = await prisma.period.findMany({
      where: { status: 'CLOSED' },
      orderBy: { yearMonth: 'desc' },
      select: { id: true, yearMonth: true },
    })

    // 2. Determine selected period (URL param or default to most recent)
    const params = await searchParams
    const periodParam = typeof params.period === 'string' ? params.period : undefined
    selectedYearMonth = periodParam ?? closedPeriods[0]?.yearMonth

    // 3. Fetch snapshots for the selected period only
    if (selectedYearMonth) {
      snapshots = await prisma.varianceSnapshot.findMany({
        where: { period: { yearMonth: selectedYearMonth } },
        orderBy: { scope: 'asc' },
      })
    }
  } catch { /* DB not available in build */ }

  if (closedPeriods.length === 0) {
    return (
      <div data-testid="variance-dashboard" className="p-8 text-sm text-text-3 italic">
        차이 데이터 없음. 먼저 차이 분석이 포함된 기간 마감을 실행하세요.
      </div>
    )
  }

  // @AX:ANCHOR: [AUTO] variance chart aggregation — sums priceEffect+volumeEffect+mixEffect per scope; excludes efficiencyEffect and residual intentionally
  // @AX:WARN: [AUTO] implicit three-field sum — no bounds check; NaN inputs from Decimal coercion produce silent 0; validate upstream if engine can emit null fields
  const chartData = snapshots.map((s) => ({
    name: s.scope,
    value: Number(s.priceEffect) + Number(s.volumeEffect) + Number(s.mixEffect),
  }))

  return (
    <div data-testid="variance-dashboard" className="p-8">
      {closedPeriods.length > 0 && (
        <form method="GET" className="mb-6">
          <label className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3 mr-2">
            기간
          </label>
          <select
            name="period"
            defaultValue={selectedYearMonth}
            className="border border-border bg-surface px-2 py-1 text-sm text-text-1"
          >
            {closedPeriods.map((p) => (
              <option key={p.id} value={p.yearMonth}>
                {p.yearMonth}
              </option>
            ))}
          </select>
          <button type="submit" className="ml-2 text-xs text-accent hover:text-accent-hover transition-colors">
            이동
          </button>
        </form>
      )}

      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">
          차이 분석
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.06em] text-text-3">
          가격 · 수량 · 구성 효과
        </p>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-sm text-text-3 italic">선택한 기간의 차이 데이터가 없습니다.</p>
      ) : (
        <>
          <div className="mb-10 border border-border bg-surface p-4">
            <VarianceBarChart data={chartData} />
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">범위</th>
                <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">가격</th>
                <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">수량</th>
                <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">구성</th>
                <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">효율</th>
                <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">잔차</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors"
                >
                  <td className="py-3 font-medium text-text-1">{s.scope}</td>
                  <td className={`py-3 text-right tabular-nums font-medium ${signClass(Number(s.priceEffect))}`}>
                    {fmt(Number(s.priceEffect))}
                  </td>
                  <td className={`py-3 text-right tabular-nums font-medium ${signClass(Number(s.volumeEffect))}`}>
                    {fmt(Number(s.volumeEffect))}
                  </td>
                  <td className={`py-3 text-right tabular-nums font-medium ${signClass(Number(s.mixEffect))}`}>
                    {fmt(Number(s.mixEffect))}
                  </td>
                  <td className={`py-3 text-right tabular-nums font-medium ${signClass(Number(s.efficiencyEffect))}`}>
                    {fmt(Number(s.efficiencyEffect))}
                  </td>
                  <td className={`py-3 text-right tabular-nums font-medium ${signClass(Number(s.residual))}`}>
                    {fmt(Number(s.residual))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}
