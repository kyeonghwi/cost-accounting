import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization } from '@prisma/client'

// @AX:NOTE: [AUTO] magic constant — kind filter 'HQ' is a domain enum value shared across all dashboard entry points
export default async function Home() {
  let hqList: Organization[] = []
  try {
    hqList = await prisma.organization.findMany({
      where: { kind: 'HQ' },
      orderBy: { name: 'asc' },
    })
  } catch { /* DB not available in build */ }

  return (
    <div data-testid="home-page" className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Cost Accounting</h1>

      {/* Workflow cards */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Workflows</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            href="/dashboard/enterprise"
            className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Enterprise Dashboard</h3>
            <p className="mt-1 text-sm text-gray-500">View cost roll-up across the enterprise</p>
          </Link>
          <Link
            href="/close"
            className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Period Close</h3>
            <p className="mt-1 text-sm text-gray-500">Run allocations and close accounting periods</p>
          </Link>
          <Link
            href="/dashboard/variance"
            className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-gray-900">Variance Analysis</h3>
            <p className="mt-1 text-sm text-gray-500">Inspect price, volume, and mix effects</p>
          </Link>
        </div>
      </section>

      {/* @AX:ANCHOR: [AUTO] E2E drill-down entry point — home→HQ→project→personnel navigation chain starts here */}
      {/* HQ list — required for E2E drill navigation (click 1) */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          HQ Headquarters
        </h2>
        {hqList.length === 0 ? (
          <p className="text-gray-400">No data available. Run seed first.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-gray-500">
                <th className="py-2">HQ Name</th>
              </tr>
            </thead>
            <tbody>
              {hqList.map((hq) => (
                <tr key={hq.id} className="border-b last:border-0" data-testid="hq-row">
                  <td className="py-2">
                    <Link
                      href={`/dashboard/hq/${hq.id}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {hq.name}
                    </Link>
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
