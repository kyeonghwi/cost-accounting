import { NavLink } from '@/components/layout/NavLink'

// @AX:ANCHOR: [AUTO] master data navigation manifest — adding or removing a master data module requires a matching entry here
const NAV_LINKS = [
  { href: '/organizations', label: '조직' },
  { href: '/projects', label: '프로젝트' },
  { href: '/personnel', label: '인원' },
  { href: '/standard-rates', label: '표준 단가' },
  { href: '/transfer-markups', label: '이전 마크업' },
  { href: '/cost-entries', label: '비용 항목' },
]

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" data-testid="master-layout">
      <nav className="w-52 shrink-0 border-r border-border bg-surface-alt p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-text-3">
          마스터 데이터
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
