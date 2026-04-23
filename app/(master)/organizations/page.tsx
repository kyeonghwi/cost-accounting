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
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">조직</h1>

      <form action={createOrganization} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">새 조직</h2>
        <div className="flex flex-wrap gap-3">
          <input name="name" required placeholder="이름" className={`flex-1 ${INPUT_CLASS}`} />
          <select name="kind" required className={INPUT_CLASS}>
            <option value="">종류…</option>
            <option value="ENTERPRISE">기업</option>
            <option value="HQ">본부</option>
            <option value="DEPARTMENT">부서</option>
          </select>
          <select name="parentId" className={INPUT_CLASS}>
            <option value="">상위 없음</option>
            {allOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
          생성
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>이름</th>
            <th className={`${TH_CLASS} pr-4`}>종류</th>
            <th className={TH_CLASS}>상위</th>
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
              <td colSpan={3} className="py-4 text-center text-xs text-text-3 italic">조직이 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
