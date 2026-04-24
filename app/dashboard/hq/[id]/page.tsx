import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization, Project } from '@prisma/client'
// @AX:NOTE: [AUTO] magic constant — 'HQ' kind used implicitly via ownerHqId; parent org lookup relies on DB-level kind constraint

type Props = { params: Promise<{ id: string }> }

// Financial summary from the most recent CLOSED AllocationRun
interface FinancialSummary {
  directCost: number
  allocatedCost: number
  transferCredit: number
  transferCharge: number
  contribution: number
  hasClosed: boolean
}

function SummaryCard({ label, value, placeholder }: { label: string; value: number | null; placeholder?: string }) {
  return (
    <div className="border border-border bg-surface p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">{label}</p>
      {value !== null ? (
        <p className="mt-1 text-lg font-semibold tabular-nums text-text-1">
          {value.toLocaleString('ko-KR', { minimumFractionDigits: 0 })}
        </p>
      ) : (
        <p className="mt-1 text-sm italic text-text-3">{placeholder ?? '—'}</p>
      )}
    </div>
  )
}

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

  // Financial summary — most recent CLOSED AllocationRun
  let summary: FinancialSummary | null = null

  try {
    // Find the most recent CLOSED AllocationRun
    const latestRun = await prisma.allocationRun.findFirst({
      where: { period: { status: 'CLOSED' } },
      orderBy: { createdAt: 'desc' },
      include: { period: { select: { id: true } } },
    })

    if (!latestRun) {
      // REQ-PIPE-09: no CLOSED period — show cumulative direct cost only
      const directAgg = await prisma.costEntry.aggregate({
        where: { personnel: { homeHqId: id } },
        _sum: { amount: true },
      })
      summary = {
        directCost: Number(directAgg._sum.amount ?? 0),
        allocatedCost: 0,
        transferCredit: 0,
        transferCharge: 0,
        contribution: Number(directAgg._sum.amount ?? 0),
        hasClosed: false,
      }
    } else {
      const runPeriodId = latestRun.period.id

      // Direct cost: CostEntries where personnel.homeHqId = id, same period
      const directAgg = await prisma.costEntry.aggregate({
        where: { periodId: runPeriodId, personnel: { homeHqId: id } },
        _sum: { amount: true },
      })

      // Allocated cost: AllocationResult rows for this run, toProject.ownerHqId = id
      const allocAgg = await prisma.allocationResult.aggregate({
        where: { runId: latestRun.id, toProject: { ownerHqId: id } },
        _sum: { amount: true },
      })

      // Transfer credit (CREDIT): fromHqId = id (this HQ's personnel worked at other HQs)
      const creditAgg = await prisma.transferEntry.aggregate({
        where: { periodId: runPeriodId, fromHqId: id, direction: 'CREDIT' },
        _sum: { amount: true },
      })

      // Transfer charge (CHARGE): toHqId = id (other HQs' personnel worked at this HQ's projects)
      const chargeAgg = await prisma.transferEntry.aggregate({
        where: { periodId: runPeriodId, toHqId: id, direction: 'CHARGE' },
        _sum: { amount: true },
      })

      const directCost = Number(directAgg._sum.amount ?? 0)
      const allocatedCost = Number(allocAgg._sum.amount ?? 0)
      const transferCredit = Number(creditAgg._sum.amount ?? 0)
      const transferCharge = Number(chargeAgg._sum.amount ?? 0)
      // @AX:NOTE: [AUTO] sign convention — contribution = directCost + transferCharge - transferCredit; credit reduces net cost (personnel billed out), charge increases it (personnel received); reversing signs breaks the P&L direction
      // Contribution: 직접비 + 이전지급 - 이전수취
      const contribution = directCost + transferCharge - transferCredit

      summary = { directCost, allocatedCost, transferCredit, transferCharge, contribution, hasClosed: true }
    }
  } catch { /* DB not available in build or hq not found */ }

  return (
    <div data-testid="hq-dashboard" className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-1">{hq.name}</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.06em] text-text-3">본부 — 프로젝트</p>
      </div>

      {summary && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryCard label="직접비" value={summary.directCost} />
          <SummaryCard
            label="배부액"
            value={summary.hasClosed ? summary.allocatedCost : null}
            placeholder="마감 후 표시"
          />
          <SummaryCard
            label="이전수취"
            value={summary.hasClosed ? summary.transferCredit : null}
            placeholder="마감 후 표시"
          />
          <SummaryCard
            label="이전지급"
            value={summary.hasClosed ? summary.transferCharge : null}
            placeholder="마감 후 표시"
          />
          <SummaryCard label="기여이익" value={summary.hasClosed ? summary.contribution : null} placeholder="마감 후 표시" />
        </div>
      )}

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
