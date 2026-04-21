// @AX:NOTE: [AUTO] page queries DB directly via prisma — if close logic grows, move DB reads into a dedicated query function in lib/close/
// @AX:TODO: [AUTO] ClosePage has no test; consider an E2E or server component integration test covering the empty-history and populated-history paths
import { prisma } from '@/lib/prisma'
import { getCloseHistory } from './actions'
import { CloseForm } from './CloseForm'

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-')
  const date = new Date(Number(year), Number(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
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
    <div data-testid="close-page" className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Monthly Close</h1>

      <CloseForm openPeriods={openPeriods} />

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Runs</h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500">No runs yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Period</th>
                <th className="text-left py-2 pr-4">Method</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((run) => (
                <tr key={run.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{run.createdAt.toISOString().slice(0, 16)}</td>
                  <td className="py-2 pr-4">{formatYearMonth(run.period.yearMonth)}</td>
                  <td className="py-2 pr-4">{run.method}</td>
                  <td className="py-2">{run.period.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
