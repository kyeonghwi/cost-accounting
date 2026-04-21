'use client'

export function DemoBanner() {
  return (
    <div
      data-testid="demo-banner"
      className="w-full bg-amber-100 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900"
    >
      Demo Mode — no authentication required
    </div>
  )
}
