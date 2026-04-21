import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Personnel, Project } from '@prisma/client'

type Props = { params: Promise<{ id: string }> }

export default async function ProjectDashboard({ params }: Props) {
  const { id } = await params

  let project: Project | null = null
  let personnelList: Personnel[] = []

  try {
    project = await prisma.project.findUnique({ where: { id } })
    if (project) {
      // @AX:ANCHOR: [AUTO] two-query distinct personnel lookup — entries→ids→personnel; change only with matching migration of all callers
      const entries = await prisma.costEntry.findMany({
        where: { projectId: id },
        select: { personnelId: true },
        distinct: ['personnelId'],
      })
      const personnelIds = entries.map((e) => e.personnelId)
      if (personnelIds.length > 0) {
        personnelList = await prisma.personnel.findMany({
          where: { id: { in: personnelIds } },
          orderBy: { name: 'asc' },
        })
      }
    }
  } catch { /* DB not available in build */ }

  if (!project) {
    return <div className="p-8 text-sm text-text-3 italic">Project not found.</div>
  }

  return (
    <div data-testid="project-dashboard" className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">{project.name}</h1>
        <div className="mt-2 flex gap-6 text-xs text-text-3">
          <span>Code: <span className="font-mono text-text-2">{project.code}</span></span>
          <span>Budget: <span className="tabular-nums text-text-2">${Number(project.budgetAmount).toLocaleString('en-US', { minimumFractionDigits: 0 })}</span></span>
        </div>
      </div>

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
        Assigned Personnel
      </h2>

      {personnelList.length === 0 ? (
        <p className="text-sm text-text-3 italic">No personnel with cost entries on this project.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong">
              <th className="pb-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">Name</th>
              <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3"></th>
            </tr>
          </thead>
          <tbody>
            {personnelList.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors" data-testid="personnel-row">
                <td className="py-2.5 pr-4 font-medium text-text-1">{p.name}</td>
                <td className="py-2.5">
                  <Link
                    href={`/dashboard/personnel/${p.id}`}
                    className="text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    Details →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
