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
    return <div className="p-8 text-gray-500">Personnel not found.</div>
  }

  return (
    <div data-testid="personnel-detail" className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Personnel Detail</h1>

      <dl className="mb-8 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">Name</dt>
          <dd>
            <span data-testid="personnel-name" className="font-medium text-gray-900">
              {person.name}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Standard Hourly Rate
          </dt>
          <dd>
            <span data-testid="personnel-standard-rate" className="tabular-nums text-gray-900">
              {rate ? `$${Number(rate.amount).toFixed(2)}/hr` : 'No rate on file'}
            </span>
          </dd>
        </div>
      </dl>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Recent Cost Entries
      </h2>
      {entries.length === 0 ? (
        <p className="text-gray-400">No cost entries found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Date</th>
              <th className="py-2 pr-4 text-right">Hours</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b last:border-0">
                <td className="py-2 pr-4 text-gray-600">
                  {new Date(e.date).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{Number(e.hours).toFixed(1)}</td>
                <td className="py-2 text-right tabular-nums">${Number(e.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
