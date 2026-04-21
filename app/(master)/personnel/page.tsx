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
      <h1 className="mb-4 text-xl font-semibold">Personnel</h1>

      <form action={createPersonnel} className="mb-6 space-y-3 rounded border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">New Personnel</h2>
        <div className="flex flex-wrap gap-3">
          <input
            name="name"
            required
            placeholder="Name"
            className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm"
          />
          <select name="homeHqId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Home HQ…</option>
            {hqOrgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <select name="costCategoryId" required className="rounded border border-gray-300 px-3 py-1.5 text-sm">
            <option value="">Category…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} ({c.kind})
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
          Create
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase text-gray-500">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Home HQ</th>
            <th className="py-2">Cost Category</th>
          </tr>
        </thead>
        <tbody>
          {personnel.map((p) => (
            <tr key={p.id} className="border-b last:border-0">
              <td className="py-2 pr-4">{p.name}</td>
              <td className="py-2 pr-4 text-gray-500">{p.homeHq.name}</td>
              <td className="py-2">{p.costCategory.code}</td>
            </tr>
          ))}
          {personnel.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-400">
                No personnel yet
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
