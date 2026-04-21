// @AX:ANCHOR: [AUTO] root layout — PersonaProvider wraps entire app tree; removing or relocating it breaks all persona-aware components
import type { Metadata } from 'next'
import './globals.css'
import { DemoBanner } from '@/components/demo/DemoBanner'
import { PersonaSwitcher } from '@/components/demo/PersonaSwitcher'
import { PersonaProvider } from '@/lib/persona'

export const metadata: Metadata = {
  title: 'Cost Accounting — Demo',
  description: 'Portfolio prototype for cost/management accounting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PersonaProvider>
          {/* @AX:NOTE: [AUTO] DemoBanner is unconditionally rendered — add an env/config guard before shipping to production */}
          <DemoBanner />
          <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3">
            <span className="font-semibold text-gray-800">Cost Accounting</span>
            <PersonaSwitcher />
          </header>
          <main>{children}</main>
        </PersonaProvider>
      </body>
    </html>
  )
}
