// @AX:NOTE: [AUTO] page queries DB directly via prisma — if close logic grows, move DB reads into a dedicated query function in lib/close/
// @AX:TODO: [AUTO] ClosePage has no test; consider an E2E or server component integration test covering the empty-history and populated-history paths
// @AX:CYCLE:1
import { prisma } from '@/lib/prisma'
import { closeAction, getCloseHistory } from './actions'

// Wrap the typed action so it satisfies the void-return form action contract.
async function handleClose(formData: FormData): Promise<void> {
  'use server'
  await closeAction(formData)
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

      {/* Run Close form */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Run Close</h2>
        <form action={handleClose} className="flex flex-col gap-4 max-w-sm">
          <div>
            <label htmlFor="periodId" className="block text-sm font-medium mb-1">
              Period
            </label>
            <select
              id="periodId"
              name="periodId"
              required
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">Select a period</option>
              {openPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.yearMonth}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="method" className="block text-sm font-medium mb-1">
              Allocation Method
            </label>
            <select
              id="method"
              name="method"
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="DIRECT">Direct</option>
              <option value="STEP_DOWN">Step-Down</option>
            </select>
          </div>

          <button
            type="submit"
            className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            Run Close
          </button>
        </form>
      </section>

      {/* Run history table */}
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
                  <td className="py-2 pr-4">{run.period.yearMonth}</td>
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
