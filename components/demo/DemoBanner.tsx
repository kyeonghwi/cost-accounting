'use client'

export function DemoBanner() {
  return (
    <div
      data-testid="demo-banner"
      className="w-full bg-warn-bg border-b border-warn-border px-4 py-1.5 text-center text-xs tracking-[0.04em] text-warn-text"
    >
      Demo Mode — no authentication required
    </div>
  )
}
