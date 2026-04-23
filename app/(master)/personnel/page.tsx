'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { PersonnelCreateSchema } from '@/lib/zod/master'
import { logAudit } from '@/lib/audit'
import type { CostCategory, Organization, Personnel } from '@prisma/client'

type PersonnelWithRefs = Personnel & { homeHq: Organization; costCategory: CostCategory }

async function createPersonnel(formData: FormData) {
  'use server'
  const raw = {
    name: formData.get('name'),
    homeHqId: formData.get('homeHqId'),
    costCategoryId: formData.get('costCategoryId'),
  }
  const result = PersonnelCreateSchema.safeParse(raw)
  if (!result.success) return
  const person = await prisma.personnel.create({ data: result.data })
  await logAudit(prisma, 'Personnel', 'CREATE', person.id, undefined, result.data)
  revalidatePath('/personnel')
}

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

export default async function PersonnelPage() {
  let personnel: PersonnelWithRefs[] = []
  let hqOrgs: Organization[] = []
  let categories: CostCategory[] = []
  try {
    personnel = await prisma.personnel.findMany({
      orderBy: { name: 'asc' },
      include: { homeHq: true, costCategory: true },
    })
    hqOrgs = await prisma.organization.findMany({
      where: { kind: 'HQ' },
      orderBy: { name: 'asc' },
    })
    categories = await prisma.costCategory.findMany({ orderBy: { code: 'asc' } })
  } catch {
    // DB not available
  }

  return (
    <div data-testid="personnel-page">
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">인원</h1>

      <form action={createPersonnel} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">새 인원</h2>
        <div className="flex flex-wrap gap-3">
          <input name="name" required placeholder="이름" className={`flex-1 ${INPUT_CLASS}`} />
          <select name="homeHqId" required className={INPUT_CLASS}>
            <option value="">소속 본부…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
          <select name="costCategoryId" required className={INPUT_CLASS}>
            <option value="">카테고리…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.code} ({c.kind})</option>
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
            <th className={`${TH_CLASS} pr-4`}>소속 본부</th>
            <th className={TH_CLASS}>비용 카테고리</th>
          </tr>
        </thead>
        <tbody>
          {personnel.map((p) => (
            <tr key={p.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 font-medium text-text-1">{p.name}</td>
              <td className="py-2.5 pr-4 text-text-2">{p.homeHq.name}</td>
              <td className="py-2.5 font-mono text-xs text-text-2">{p.costCategory.code}</td>
            </tr>
          ))}
          {personnel.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-xs text-text-3 italic">인원이 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
