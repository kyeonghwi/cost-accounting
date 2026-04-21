'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { OrganizationCreateSchema } from '@/lib/zod/master'
import { logAudit } from '@/lib/audit'
import type { Organization } from '@prisma/client'

type OrgWithParent = Organization & { parent: Organization | null }

async function createOrganization(formData: FormData) {
  'use server'
  const raw = {
    name: formData.get('name'),
    kind: formData.get('kind'),
    parentId: formData.get('parentId') || undefined,
  }
  const result = OrganizationCreateSchema.safeParse(raw)
  if (!result.success) return
  const org = await prisma.organization.create({ data: result.data })
  await logAudit(prisma, 'Organization', 'CREATE', org.id, undefined, result.data)
  revalidatePath('/organizations')
}

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

export default async function OrganizationsPage() {
  let orgs: OrgWithParent[] = []
  let allOrgs: Organization[] = []
  try {
    orgs = await prisma.organization.findMany({
      orderBy: { name: 'asc' },
      include: { parent: true },
    })
    allOrgs = orgs
  } catch {
    // DB not available
  }

  return (
    <div data-testid="organizations-page">
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">Organizations</h1>

      <form action={createOrganization} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">New Organization</h2>
        <div className="flex flex-wrap gap-3">
          <input name="name" required placeholder="Name" className={`flex-1 ${INPUT_CLASS}`} />
          <select name="kind" required className={INPUT_CLASS}>
            <option value="">Kind…</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="HQ">HQ</option>
            <option value="DEPARTMENT">Department</option>
          </select>
          <select name="parentId" className={INPUT_CLASS}>
            <option value="">No parent</option>
            {allOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
          Create
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>Name</th>
            <th className={`${TH_CLASS} pr-4`}>Kind</th>
            <th className={TH_CLASS}>Parent</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 font-medium text-text-1">{o.name}</td>
              <td className="py-2.5 pr-4 text-text-2">{o.kind}</td>
              <td className="py-2.5 text-text-2">{o.parent?.name ?? '—'}</td>
            </tr>
          ))}
          {orgs.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-xs text-text-3 italic">No organizations yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
