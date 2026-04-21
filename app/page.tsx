import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import type { Organization } from '@prisma/client'

const WORKFLOWS = [
  {
    index: '01',
    href: '/dashboard/enterprise',
    title: 'Enterprise Roll-Up',
    description: 'Aggregate cost totals across all headquarters and subsidiaries',
  },
  {
    index: '02',
    href: '/close',
    title: 'Period Close',
    description: 'Run overhead allocations and lock accounting periods',
  },
  {
    index: '03',
    href: '/dashboard/variance',
    title: 'Variance Analysis',
    description: 'Decompose price, volume, and mix effects by scope',
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
          Cost Accounting
        </h1>
        <p className="mt-1.5 text-sm text-text-3">Management accounting demonstration system</p>
      </div>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
          Workflows
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
          Headquarters
        </h2>
        {hqList.length === 0 ? (
          <p className="text-sm text-text-3 italic">No data — run seed first.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-strong">
                <th className="pb-2 text-left text-xs font-semibold uppercase tracking-[0.06em] text-text-3">
                  HQ Name
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
