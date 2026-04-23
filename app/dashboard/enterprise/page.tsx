import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization } from '@prisma/client'
import { ExportButton } from '@/components/export/ExportButton'

// @AX:NOTE: [AUTO] magic constant — kind filter 'HQ' duplicated from home page; centralise if enum grows
type HqWithCost = Organization & { totalCost: string }

const EXPORT_COLUMNS = ['name', 'totalCost']

export default async function EnterpriseDashboard() {
  let hqList: HqWithCost[] = []
  try {
    const orgs = await prisma.organization.findMany({
      where: { kind: 'HQ' },
      orderBy: { name: 'asc' },
    })

    // @AX:WARN: [AUTO] O(n) linear scan inside loop — costGroups × personnelList join is in-memory; degrades with large datasets; consider a direct SQL join or indexed map
    // @AX:ANCHOR: [AUTO] enterprise cost roll-up — aggregates all CostEntry rows by HQ; used as the top-level financial summary
    const costGroups = await prisma.costEntry.groupBy({
      by: ['personnelId'],
      _sum: { amount: true },
    })

    const personnelList = await prisma.personnel.findMany({
      select: { id: true, homeHqId: true },
    })

    const hqTotals: Record<string, number> = {}
    for (const cg of costGroups) {
      const p = personnelList.find((x) => x.id === cg.personnelId)
      if (p) {
        hqTotals[p.homeHqId] = (hqTotals[p.homeHqId] ?? 0) + Number(cg._sum.amount ?? 0)
      }
    }

    hqList = orgs.map((org) => ({
      ...org,
      totalCost: (hqTotals[org.id] ?? 0).toFixed(2),
    }))
  } catch { /* DB not available in build */ }

  if (!hqList.length) {
    return <div className="p-8 text-sm text-text-3 italic">데이터 없음 — 시드를 먼저 실행하세요.</div>
  }

  const exportData: Record<string, unknown>[] = hqList.map((hq) => ({
    name: hq.name,
    totalCost: hq.totalCost,
  }))

  const grandTotal = hqList.reduce((acc, hq) => acc + Number(hq.totalCost), 0)

  return (
    <div data-testid="enterprise-dashboard" className="p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">
            전사 대시보드
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.06em] text-text-3">
            본부별 비용 집계
          </p>
        </div>
        <ExportButton
          data={exportData}
          columns={EXPORT_COLUMNS}
          filename="enterprise-costs.csv"
          label="CSV 내보내기"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">
              본부
            </th>
            <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">
              총 비용
            </th>
          </tr>
        </thead>
        <tbody>
          {hqList.map((hq) => (
            <tr
              key={hq.id}
              className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors"
              data-testid="hq-row"
            >
              <td className="py-3">
                <Link
                  href={`/dashboard/hq/${hq.id}`}
                  className="font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  {hq.name}
                </Link>
              </td>
              <td className="py-3 text-right tabular-nums font-medium text-text-1">
                ${Number(hq.totalCost).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-border-strong">
            <td className="pt-3 text-xs font-semibold uppercase tracking-[0.06em] text-text-3">
              합계
            </td>
            <td className="pt-3 text-right tabular-nums font-semibold text-text-1">
              ${grandTotal.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
