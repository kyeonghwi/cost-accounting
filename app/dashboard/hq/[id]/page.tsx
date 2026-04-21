import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization, Project } from '@prisma/client'
// @AX:NOTE: [AUTO] magic constant — 'HQ' kind used implicitly via ownerHqId; parent org lookup relies on DB-level kind constraint

type Props = { params: Promise<{ id: string }> }

export default async function HqDashboard({ params }: Props) {
  const { id } = await params

  let hq: Organization | null = null
  let projects: Project[] = []

  try {
    hq = await prisma.organization.findUnique({ where: { id } })
    projects = await prisma.project.findMany({
      where: { ownerHqId: id },
      orderBy: { name: 'asc' },
    })
  } catch { /* DB not available in build */ }

  if (!hq) {
    return <div className="p-8 text-gray-500">HQ not found.</div>
  }

  return (
    <div data-testid="hq-dashboard" className="p-8">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">{hq.name}</h1>
      <p className="mb-6 text-sm text-gray-500">HQ — Projects</p>

      {projects.length === 0 ? (
        <p className="text-gray-400">No projects for this HQ.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-gray-500">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Project Name</th>
              <th className="py-2 pr-4 text-right">Budget</th>
              <th className="py-2">Link</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((proj) => (
              <tr key={proj.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono text-xs text-gray-600">{proj.code}</td>
                <td className="py-2 pr-4 font-medium text-gray-900">{proj.name}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  ${Number(proj.budgetAmount).toLocaleString()}
                </td>
                <td className="py-2">
                  <Link
                    href={`/dashboard/project/${proj.id}`}
                    className="text-indigo-600 hover:underline"
                  >
                    Project: {proj.name}
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
