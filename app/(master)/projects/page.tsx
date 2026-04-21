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

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

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
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">Projects</h1>

      <form action={createProject} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">New Project</h2>
        <div className="flex flex-wrap gap-3">
          <input name="code" required placeholder="Code" className={`w-28 ${INPUT_CLASS}`} />
          <input name="name" required placeholder="Name" className={`flex-1 ${INPUT_CLASS}`} />
          <select name="ownerHqId" required className={INPUT_CLASS}>
            <option value="">Owner HQ…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <input
            name="budgetAmount"
            required
            placeholder="Budget (e.g. 100000)"
            inputMode="decimal"
            className={`w-40 ${INPUT_CLASS}`}
          />
        </div>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
          Create
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>Code</th>
            <th className={`${TH_CLASS} pr-4`}>Name</th>
            <th className={`${TH_CLASS} pr-4`}>Owner HQ</th>
            <th className={TH_CLASS}>Budget</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 font-mono text-xs text-text-2">{p.code}</td>
              <td className="py-2.5 pr-4 font-medium text-text-1">{p.name}</td>
              <td className="py-2.5 pr-4 text-text-2">{p.ownerHq.name}</td>
              <td className="py-2.5 tabular-nums text-text-2">
                ${Number(p.budgetAmount).toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </td>
            </tr>
          ))}
          {projects.length === 0 && (
            <tr>
              <td colSpan={4} className="py-4 text-center text-xs text-text-3 italic">No projects yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
