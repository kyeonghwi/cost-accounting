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
      <h1 className="mb-4 text-xl font-semibold">Organizations</h1>

      {/* Create form */}
      <form action={createOrganization} className="mb-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">New Organization</h2>
        <div className="flex flex-wrap gap-3">
          <input
            name="name"
            required
            placeholder="Name"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select name="kind" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Kind…</option>
            <option value="ENTERPRISE">Enterprise</option>
            <option value="HQ">HQ</option>
            <option value="DEPARTMENT">Department</option>
          </select>
          <select name="parentId" className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">No parent</option>
            {allOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
          Create
        </button>
      </form>

      {/* List */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Kind</th>
            <th className="py-2">Parent</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => (
            <tr key={o.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{o.name}</td>
              <td className="py-2 pr-4">{o.kind}</td>
              <td className="py-2 text-gray-500">{o.parent?.name ?? '—'}</td>
            </tr>
          ))}
          {orgs.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-400">
                No organizations yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
