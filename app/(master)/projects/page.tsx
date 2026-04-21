'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { ProjectCreateSchema } from '@/lib/zod/master'
import { logAudit } from '@/lib/audit'
import type { Organization, Project } from '@prisma/client'

type ProjectWithOwner = Project & { ownerHq: Organization }

async function createProject(formData: FormData) {
  'use server'
  const raw = {
    code: formData.get('code'),
    name: formData.get('name'),
    ownerHqId: formData.get('ownerHqId'),
    budgetAmount: formData.get('budgetAmount'),
  }
  const result = ProjectCreateSchema.safeParse(raw)
  if (!result.success) return
  const project = await prisma.project.create({ data: result.data })
  await logAudit(prisma, 'Project', 'CREATE', project.id, undefined, result.data)
  revalidatePath('/projects')
}

export default async function ProjectsPage() {
  let projects: ProjectWithOwner[] = []
  let hqOrgs: Organization[] = []
  try {
    projects = await prisma.project.findMany({
      orderBy: { name: 'asc' },
      include: { ownerHq: true },
    })
    hqOrgs = await prisma.organization.findMany({
      where: { kind: 'HQ' },
      orderBy: { name: 'asc' },
    })
  } catch {
    // DB not available
  }

  return (
    <div data-testid="projects-page">
      <h1 className="mb-4 text-xl font-semibold">Projects</h1>

      <form action={createProject} className="mb-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">New Project</h2>
        <div className="flex flex-wrap gap-3">
          <input
            name="code"
            required
            placeholder="Code"
            className="w-28 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <input
            name="name"
            required
            placeholder="Name"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select name="ownerHqId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Owner HQ…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <input
            name="budgetAmount"
            required
            placeholder="Budget (e.g. 100000)"
            inputMode="decimal"
            className="w-40 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
          Create
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Owner HQ</th>
            <th className="py-2">Budget</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2 pr-4 font-mono text-xs">{p.code}</td>
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2 pr-4 text-gray-500">{p.ownerHq.name}</td>
              <td className="py-2">{p.budgetAmount.toString()}</td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-gray-400">
                No projects yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
