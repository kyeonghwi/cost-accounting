import Link from 'next/link'

const WORKFLOWS = [
  {
    index: '01',
    href: '/dashboard/enterprise',
    title: 'Enterprise Dashboard',
    description:
      'Aggregates CostEntry rows by home HQ, displays total spend per headquarters, and includes CSV export.',
  },
  {
    index: '02',
    href: '/close',
    title: 'Period Close',
    description:
      'Runs cost allocations, executes inter-HQ transfers, and locks accounting periods from a single page.',
  },
  {
    index: '03',
    href: '/dashboard/variance',
    title: 'Variance Analysis',
    description:
      'Inspects price, volume, and mix variance between budget and actuals for every cost category.',
  },
]

export default function DemoLanding() {
  return (
    <div data-testid="demo-landing" className="min-h-screen bg-bg px-8 py-16">
      <div className="mx-auto max-w-3xl space-y-12">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-text-1">
            Cost Accounting
          </h1>
          <p className="mt-3 text-sm text-text-2 leading-relaxed max-w-xl">
            Demonstrates a cost-accounting system for a multi-HQ enterprise. Seed data includes
            5 HQs, 20 projects, and approximately 200 personnel records with realistic cost entries.
          </p>
        </div>

        <section>
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
            Key Workflows
          </h2>
          <div className="border border-border divide-y divide-border">
            {WORKFLOWS.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                className="group flex gap-5 bg-surface px-6 py-5 hover:bg-surface-alt transition-colors"
              >
                <span className="font-display text-xs font-medium text-text-3 tabular-nums pt-0.5 shrink-0">
                  {w.index}
                </span>
                <div>
                  <h3 className="font-display font-semibold text-text-1 group-hover:text-accent transition-colors">
                    {w.title}
                  </h3>
                  <p className="mt-1 text-xs text-text-2 leading-relaxed">{w.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="border border-border bg-surface p-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
            Seed Data
          </h2>
          <ul className="space-y-1 text-sm text-text-2">
            <li>5 HQ organizations</li>
            <li>20 projects distributed across HQs</li>
            <li>~200 personnel records with home HQ assignments</li>
            <li>CostEntry rows covering multiple accounting periods</li>
          </ul>
        </section>
      </div>
    </div>
  )
}
