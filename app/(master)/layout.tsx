import { NavLink } from '@/components/layout/NavLink'

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
      <nav className="w-52 shrink-0 border-r border-border bg-surface-alt p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
          Master Data
        </p>
        <ul className="space-y-0.5">
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <NavLink href={link.href} label={link.label} />
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1 p-6">{children}</div>
    </div>
  )
}
