import { prisma } from '@/lib/prisma'
import { createCostEntry } from './actions'
import type { CostEntry, Personnel, Project } from '@prisma/client'
import { PersonaGuard } from '@/components/demo/PersonaGuard'

type EntryWithRefs = CostEntry & { personnel: Personnel; project: Project }

const TAKE = 50

async function submitCostEntry(formData: FormData): Promise<void> {
  'use server'
  await createCostEntry(formData)
}

const INPUT_CLASS = 'rounded border border-border bg-surface px-3 py-1.5 text-sm text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-colors'
const TH_CLASS = 'pb-2.5 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3'

export default async function CostEntriesPage() {
  let entries: EntryWithRefs[] = []
  let personnel: Personnel[] = []
  let projects: Project[] = []
  let totalCount = 0
  try {
    ;[entries, personnel, projects, totalCount] = await Promise.all([
      prisma.costEntry.findMany({
        take: TAKE,
        orderBy: { date: 'desc' },
        include: { personnel: true, project: true },
      }),
      prisma.personnel.findMany({ orderBy: { name: 'asc' } }),
      prisma.project.findMany({ orderBy: { name: 'asc' } }),
      prisma.costEntry.count(),
    ])
  } catch {
    // DB not available
  }

  return (
    <div data-testid="cost-entries-page">
      <h1 className="mb-6 font-display text-xl font-semibold tracking-tight text-text-1">비용 항목</h1>

      <PersonaGuard
        allow={['accountant']}
        fallback={
          <p className="mb-6 text-xs text-text-3 italic">
            비용 항목을 생성하려면 원가담당자 페르소나로 전환하세요.
          </p>
        }
      >
        <form action={submitCostEntry} className="mb-8 space-y-3 rounded border border-border bg-surface p-4">
          <h2 className="text-xs font-semibold uppercase tracking-[0.06em] text-text-3">새 비용 항목</h2>
          <div className="flex flex-wrap gap-3">
            <select name="personnelId" required className={INPUT_CLASS}>
              <option value="">인원…</option>
              {personnel.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="projectId" required className={INPUT_CLASS}>
              <option value="">프로젝트…</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code} — {p.name}</option>
              ))}
            </select>
            <input name="date" required type="datetime-local" className={INPUT_CLASS} />
            <input
              name="hours"
              required
              placeholder="시간 (예: 8)"
              inputMode="decimal"
              className={`w-28 ${INPUT_CLASS}`}
            />
          </div>
          <p className="text-xs text-text-3">
            금액 = 시간 × 표준 단가. 기간은 날짜로 자동 결정됩니다.
          </p>
          <button type="submit" className="rounded bg-accent px-4 py-1.5 text-sm text-white hover:bg-accent-hover transition-colors">
            생성
          </button>
        </form>
      </PersonaGuard>

      <div className="mb-2 text-xs text-text-3">
        전체 {totalCount}개 중 {Math.min(entries.length, TAKE)}개 표시
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-strong">
            <th className={`${TH_CLASS} pr-4`}>날짜</th>
            <th className={`${TH_CLASS} pr-4`}>인원</th>
            <th className={`${TH_CLASS} pr-4`}>프로젝트</th>
            <th className={`${TH_CLASS} pr-4`}>시간</th>
            <th className={TH_CLASS}>금액</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors">
              <td className="py-2.5 pr-4 tabular-nums text-xs text-text-2">{e.date.toISOString().slice(0, 10)}</td>
              <td className="py-2.5 pr-4 font-medium text-text-1">{e.personnel.name}</td>
              <td className="py-2.5 pr-4 font-mono text-xs text-text-2">{e.project.code}</td>
              <td className="py-2.5 pr-4 tabular-nums text-text-2">{e.hours.toString()}</td>
              <td className="py-2.5 tabular-nums font-medium text-text-1">{e.amount.toString()}</td>
            </tr>
          ))}
          {entries.length === 0 && (
            <tr>
              <td colSpan={5} className="py-4 text-center text-xs text-text-3 italic">비용 항목이 없습니다</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
