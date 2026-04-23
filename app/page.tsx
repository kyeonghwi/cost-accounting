import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization } from '@prisma/client'

const WORKFLOWS = [
  {
    index: '01',
    href: '/dashboard/enterprise',
    title: '전사 집계',
    description: '모든 본부 및 자회사의 비용 합계 집계',
  },
  {
    index: '02',
    href: '/close',
    title: '기간 마감',
    description: '간접비 배부 실행 및 회계 기간 잠금',
  },
  {
    index: '03',
    href: '/dashboard/variance',
    title: '차이 분석',
    description: '범위별 가격, 수량, 구성 효과 분석',
  },
]

// @AX:NOTE: [AUTO] magic constant — kind filter 'HQ' is a domain enum value shared across all dashboard entry points
export default async function Home() {
  let hqList: Organization[] = []
  try {
    hqList = await prisma.organization.findMany({
      where: { kind: 'HQ' },
      orderBy: { name: 'asc' },
    })
  } catch { /* DB not available in build */ }

  return (
    <div data-testid="home-page" className="mx-auto max-w-4xl px-8 py-10 space-y-12">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-text-1">
          원가회계
        </h1>
        <p className="mt-1.5 text-sm text-text-3">관리회계 데모 시스템</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
          워크플로
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 border border-border divide-y sm:divide-y-0 sm:divide-x divide-border">
          {WORKFLOWS.map((w) => (
            <Link
              key={w.href}
              href={w.href}
              className="group block bg-surface px-6 py-5 hover:bg-surface-alt transition-colors"
            >
              <span className="block font-display text-xs font-medium text-text-3 mb-2 tabular-nums">
                {w.index}
              </span>
              <h3 className="font-display text-base font-semibold text-text-1 group-hover:text-accent transition-colors">
                {w.title}
              </h3>
              <p className="mt-1.5 text-xs text-text-2 leading-relaxed">{w.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* @AX:ANCHOR: [AUTO] E2E drill-down entry point — home→HQ→project→personnel navigation chain starts here */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
          본부
        </h2>
        {hqList.length === 0 ? (
          <p className="text-sm text-text-3 italic">데이터 없음 — 시드를 먼저 실행하세요.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">
                  본부명
                </th>
              </tr>
            </thead>
            <tbody>
              {hqList.map((hq) => (
                <tr
                  key={hq.id}
                  className="border-b border-border last:border-0 hover:bg-surface-alt transition-colors"
                  data-testid="hq-row"
                >
                  <td className="py-2.5">
                    <Link
                      href={`/dashboard/hq/${hq.id}`}
                      className="font-medium text-accent hover:text-accent-hover transition-colors"
                    >
                      {hq.name}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
