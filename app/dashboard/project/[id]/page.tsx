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
      // Find unique personnel who have cost entries on this project
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
    return <div className="p-8 text-gray-500">Project not found.</div>
  }

  return (
    <div data-testid="project-dashboard" className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{project.name}</h1>
      <p className="mb-1 text-sm text-gray-500">
        Code: <span className="font-mono">{project.code}</span>
      </p>
      <p className="mb-6 text-sm text-gray-500">
        Budget: ${Number(project.budgetAmount).toLocaleString()}
      </p>

      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
        Assigned Personnel
      </h2>

      {personnelList.length === 0 ? (
        <p className="text-gray-400">No personnel with cost entries on this project.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Name</th>
              <th className="py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {personnelList.map((p) => (
              <tr key={p.id} className="border-b last:border-0" data-testid="personnel-row">
                <td className="py-2 pr-4 font-medium text-gray-900">{p.name}</td>
                <td className="py-2">
                  <a
                    href={`/dashboard/personnel/${p.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Personnel: {p.name}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
