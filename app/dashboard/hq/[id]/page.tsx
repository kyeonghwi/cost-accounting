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
    return <div className="p-8 text-sm text-text-3 italic">본부를 찾을 수 없습니다.</div>
  }

  return (
    <div data-testid="hq-dashboard" className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">{hq.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.06em] text-text-3">본부 — 프로젝트</p>
      </div>

      {projects.length === 0 ? (
        <p className="text-sm text-text-3 italic">이 본부에 프로젝트가 없습니다.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-strong">
              <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">코드</th>
              <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">프로젝트</th>
              <th className="pb-2.5 text-right text-xs font-semibold uppercase tracking-[0.06em] text-text-3">예산</th>
              <th className="pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3 pl-6"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((proj) => (
              <tr key={proj.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
                <td className="py-3 font-mono text-xs text-text-2">{proj.code}</td>
                <td className="py-3 font-medium text-text-1">{proj.name}</td>
                <td className="py-3 text-right tabular-nums text-text-2">
                  ${Number(proj.budgetAmount).toLocaleString('ko-KR', { minimumFractionDigits: 0 })}
                </td>
                <td className="py-3 pl-6">
                  <Link
                    href={`/dashboard/project/${proj.id}`}
                    className="text-xs text-accent hover:text-accent-hover transition-colors"
                  >
                    상세 →
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
