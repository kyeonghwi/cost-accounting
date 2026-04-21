import Link from 'next/link'

const WORKFLOWS = [
  {
    href: '/dashboard/enterprise',
    title: 'Enterprise Dashboard',
    description:
      'View cost roll-up across all HQs. Aggregates CostEntry rows by home HQ and displays total spend per headquarters. Includes CSV export.',
  },
  {
    href: '/close',
    title: 'Period Close',
    description:
      'Run cost allocations, execute inter-HQ transfers, and lock accounting periods. Drives the month-end close workflow from a single page.',
  },
  {
    href: '/dashboard/variance',
    title: 'Variance Analysis',
    description:
      'Inspect price, volume, and mix variance between budget and actuals. Breaks down the delta for every cost category in a readable table.',
  },
]

export default function DemoLanding() {
  return (
    <div data-testid="demo-landing" className="min-h-screen bg-gray-50 px-8 py-16">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900">Cost Accounting — Demo</h1>
        <p className="mt-3 text-gray-500">
          This app demonstrates a cost-accounting system for a multi-HQ enterprise. Seed data
          includes 5 HQs, 20 projects, and approximately 200 personnel records with realistic cost
          entries.
        </p>

        <section className="mt-12">
          <h2 className="mb-6 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Key Workflows
          </h2>
          <div className="space-y-4">
            {WORKFLOWS.map((w) => (
              <Link
                key={w.href}
                href={w.href}
                className="block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3 className="font-semibold text-gray-900">{w.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{w.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">
            Seed Data Summary
          </h2>
          <ul className="space-y-1 text-sm text-gray-600">
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
