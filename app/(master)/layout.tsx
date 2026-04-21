import Link from 'next/link'

// @AX:ANCHOR: [AUTO] master data navigation manifest — adding or removing a master data module requires a matching entry here
const NAV_LINKS = [
  { href: '/organizations', label: 'Organizations' },
  { href: '/projects', label: 'Projects' },
  { href: '/personnel', label: 'Personnel' },
  { href: '/standard-rates', label: 'Standard Rates' },
  { href: '/transfer-markups', label: 'Transfer Markups' },
  { href: '/cost-entries', label: 'Cost Entries' },
]

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" data-testid="master-layout">
      <nav className="w-52 shrink-0 border-r border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Master Data
        </p>
        <ul className="space-y-1">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="block rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
