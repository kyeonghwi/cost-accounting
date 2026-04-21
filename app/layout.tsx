import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cost Accounting — Demo',
  description: 'Portfolio prototype for cost/management accounting',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
