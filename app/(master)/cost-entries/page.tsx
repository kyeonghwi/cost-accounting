import { prisma } from '@/lib/prisma'
import { createCostEntry } from './actions'
import type { CostEntry, Personnel, Project } from '@prisma/client'
import { PersonaGuard } from '@/components/demo/PersonaGuard'

type EntryWithRefs = CostEntry & { personnel: Personnel; project: Project }

const TAKE = 50

// Wrapper discards the return value so the signature matches form action requirements
async function submitCostEntry(formData: FormData): Promise<void> {
  'use server'
  await createCostEntry(formData)
}

export default async function CostEntriesPage() {
  let entries: EntryWithRefs[] = []
  let personnel: Personnel[] = []
  let projects: Project[] = []
  let totalCount = 0
  try {
    ;[entries, personnel, projects, totalCount] = await Promise.all([
      prisma.costEntry.findMany({
        take: TAKE,
        orderBy: { date: 'desc' },
        include: { personnel: true, project: true },
      }),
      prisma.personnel.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { name: 'asc' } }),
      prisma.costEntry.count(),
    ])
  } catch {
    // DB not available
  }

  return (
    <div data-testid="cost-entries-page">
      <h1 className="mb-4 text-xl font-semibold">Cost Entries</h1>

      <PersonaGuard
        allow={['accountant']}
        fallback={<p className="mb-4 text-sm text-gray-500 italic">Switch to Cost Accountant persona to create entries.</p>}
      >
        <form
          action={submitCostEntry}
          className="mb-6 space-y-3 rounded border border-gray-200 bg-white p-4"
        >
          <h2 className="text-sm font-semibold text-gray-700">New Cost Entry</h2>
          <div className="flex flex-wrap gap-3">
            <select name="personnelId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
              <option value="">Personnel…</option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <select name="projectId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
              <option value="">Project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            <input
              name="date"
              required
              type="datetime-local"
              className="rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
            <input
              name="hours"
              required
              placeholder="Hours (e.g. 8)"
              inputMode="decimal"
              className="w-28 rounded border border-gray-300 px-3 py-1.5 text-sm"
            />
          </div>
          <p className="text-xs text-gray-400">
            Amount = hours × standard rate. Period is resolved from date automatically.
          </p>
          <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
            Create
          </button>
        </form>
      </PersonaGuard>

      <div className="mb-2 text-xs text-gray-400">
        Showing {Math.min(entries.length, TAKE)} of {totalCount} entries
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">Date</th>
            <th className="py-2 pr-4">Personnel</th>
            <th className="py-2 pr-4">Project</th>
            <th className="py-2 pr-4">Hours</th>
            <th className="py-2">Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{e.date.toISOString().slice(0, 10)}</td>
              <td className="py-2 pr-4">{e.personnel.name}</td>
              <td className="py-2 pr-4">{e.project.code}</td>
              <td className="py-2 pr-4">{e.hours.toString()}</td>
              <td className="py-2">{e.amount.toString()}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-gray-400">
                No cost entries yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
