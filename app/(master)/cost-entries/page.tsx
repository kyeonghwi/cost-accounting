import { prisma } from '@/lib/prisma'
import { createCostEntry } from './actions'
import type { CostEntry, Personnel, Project } from '@prisma/client'
import { PersonaGuard } from '@/components/demo/PersonaGuard'

type EntryWithRefs = CostEntry & { personnel: Personnel; project: Project }

const TAKE = 50

async function submitCostEntry(formData: FormData): Promise<void> {
  'use server'
  await createCostEntry(formData)
}

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

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
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">Cost Entries</h1>

      <PersonaGuard
        allow={['accountant']}
        fallback={
          <p className="mb-6 text-xs text-text-3 italic">
            Switch to Cost Accountant persona to create entries.
          </p>
        }
      >
        <form action={submitCostEntry} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">New Cost Entry</h2>
          <div className="flex flex-wrap gap-3">
            <select name="personnelId" required className={INPUT_CLASS}>
              <option value="">Personnel…</option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="projectId" required className={INPUT_CLASS}>
              <option value="">Project…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <input name="date" required type="datetime-local" className={INPUT_CLASS} />
            <input
              name="hours"
              required
              placeholder="Hours (e.g. 8)"
              inputMode="decimal"
              className={`w-28 ${INPUT_CLASS}`}
            />
          </div>
          <p className="text-xs text-text-3">
            Amount = hours × standard rate. Period is resolved from date automatically.
          </p>
          <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
            Create
          </button>
        </form>
      </PersonaGuard>

      <div className="mb-2 text-xs text-text-3">
        Showing {Math.min(entries.length, TAKE)} of {totalCount} entries
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>Date</th>
            <th className={`${TH_CLASS} pr-4`}>Personnel</th>
            <th className={`${TH_CLASS} pr-4`}>Project</th>
            <th className={`${TH_CLASS} pr-4`}>Hours</th>
            <th className={TH_CLASS}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 tabular-nums text-xs text-text-2">{e.date.toISOString().slice(0, 10)}</td>
              <td className="py-2.5 pr-4 font-medium text-text-1">{e.personnel.name}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-text-2">{e.project.code}</td>
              <td className="py-2.5 pr-4 tabular-nums text-text-2">{e.hours.toString()}</td>
              <td className="py-2.5 tabular-nums font-medium text-text-1">{e.amount.toString()}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-xs text-text-3 italic">No cost entries yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
