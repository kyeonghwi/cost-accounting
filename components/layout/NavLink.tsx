'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

type Props = { href: string; label: string }

export function NavLink({ href, label }: Props) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={clsx(
        'block rounded px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-accent-dim text-accent font-medium'
          : 'text-text-2 hover:text-text-1 hover:bg-surface-alt'
      )}
    >
      {label}
    </Link>
  )
}
