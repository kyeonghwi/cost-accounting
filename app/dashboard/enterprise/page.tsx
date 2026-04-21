import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization } from '@prisma/client'
import { ExportButton } from '@/components/export/ExportButton'

// @AX:NOTE: [AUTO] magic constant — kind filter 'HQ' duplicated from home page; centralise if enum grows
type HqWithCost = Organization & { totalCost: string }

// Columns exported to CSV
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
    // Sum cost entries per HQ (via personnel home HQ)
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
    return <div className="p-8 text-gray-500">No data available. Run seed first.</div>
  }

  // Serialize to plain objects for the client component
  const exportData: Record<string, unknown>[] = hqList.map((hq) => ({
    name: hq.name,
    totalCost: hq.totalCost,
  }))

  return (
    <div data-testid="enterprise-dashboard" className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Enterprise Dashboard</h1>
        <ExportButton
          data={exportData}
          columns={EXPORT_COLUMNS}
          filename="enterprise-costs.csv"
          label="Export CSV"
        />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">HQ</th>
            <th className="py-2 pr-4 text-right">Total Cost</th>
            <th className="py-2">Link</th>
          </tr>
        </thead>
        <tbody>
          {hqList.map((hq) => (
            <tr key={hq.id} className="border-b last:border-0" data-testid="hq-row">
              <td className="py-2 pr-4 font-medium text-gray-900">{hq.name}</td>
              <td className="py-2 pr-4 text-right tabular-nums">${hq.totalCost}</td>
              <td className="py-2">
                <Link href={`/dashboard/hq/${hq.id}`} className="text-indigo-600 hover:underline">
                  View HQ
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
