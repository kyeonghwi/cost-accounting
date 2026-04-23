// @AX:ANCHOR: [AUTO] root layout — PersonaProvider wraps entire app tree; removing or relocating it breaks all persona-aware components
import type { Metadata } from 'next'
import Link from 'next/link'
import { Barlow, Barlow_Semi_Condensed } from 'next/font/google'
import './globals.css'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher'
import { PersonaProvider } from '@/lib/persona'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-sans',
  display: 'swap',
})

const barlowSemiCondensed = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '원가회계',
  description: '원가/관리회계 포트폴리오 프로토타입',
}

const NAV = [
  { href: '/dashboard/enterprise', label: '전사' },
  { href: '/close', label: '기간 마감' },
  { href: '/dashboard/variance', label: '차이 분석' },
  { href: '/organizations', label: '마스터 데이터' },
]

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${barlow.variable} ${barlowSemiCondensed.variable}`}>
      <body className="bg-bg text-text-1 font-sans antialiased">
        <PersonaProvider>
          {/* @AX:NOTE: [AUTO] DemoBanner is unconditionally rendered — add an env/config guard before shipping to production */}
          <DemoBanner />
          <header className="bg-surface border-b border-border">
            <div className="flex items-center h-11 px-6 gap-6">
              <Link
                href="/"
                className="font-display font-semibold text-xs tracking-[0.08em] text-text-1 shrink-0 uppercase"
              >
                원가회계
              </Link>
              <nav className="flex items-center flex-1">
                {NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-3 h-11 flex items-center text-xs font-medium tracking-[0.06em] uppercase text-text-3 hover:text-text-1 transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
              <PersonaSwitcher />
            </div>
          </header>
          <main>{children}</main>
        </PersonaProvider>
      </body>
    </html>
  )
}
