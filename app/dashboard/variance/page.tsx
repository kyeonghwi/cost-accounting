import { prisma } from '@/lib/prisma'
import { VarianceBarChart } from '@/components/charts/VarianceBarChart'
import type { VarianceSnapshot } from '@prisma/client'

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
      <div data-testid="variance-dashboard" className="p-8 text-gray-500">
        No variance data available. Run a period close with variance analysis first.
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
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Variance Analysis</h1>

      <div className="mb-8">
        <VarianceBarChart data={chartData} />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">Scope</th>
            <th className="py-2 pr-4 text-right">Price</th>
            <th className="py-2 pr-4 text-right">Volume</th>
            <th className="py-2 pr-4 text-right">Mix</th>
            <th className="py-2 pr-4 text-right">Efficiency</th>
            <th className="py-2 text-right">Residual</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => (
            <tr key={s.id} className="border-b last:border-0">
              <td className="py-2 pr-4 font-medium text-gray-900">{s.scope}</td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {Number(s.priceEffect).toFixed(2)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {Number(s.volumeEffect).toFixed(2)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {Number(s.mixEffect).toFixed(2)}
              </td>
              <td className="py-2 pr-4 text-right tabular-nums">
                {Number(s.efficiencyEffect).toFixed(2)}
              </td>
              <td className="py-2 text-right tabular-nums">
                {Number(s.residual).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
