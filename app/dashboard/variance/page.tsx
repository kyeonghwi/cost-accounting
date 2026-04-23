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

export default async function VarianceDashboard() {
  let snapshots: VarianceSnapshot[] = []
  try {
    // @AX:NOTE: [AUTO] magic constant — take: 20 limits variance history shown; pagination required when periods exceed this
    snapshots = await prisma.varianceSnapshot.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  } catch { /* DB not available in build */ }

  if (!snapshots.length) {
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
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">
          차이 분석
        </h1>
        <p className="mt-1 text-xs uppercase tracking-[0.06em] text-text-3">
          가격 · 수량 · 구성 효과
        </p>
      </div>

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
    </div>
  )
}
