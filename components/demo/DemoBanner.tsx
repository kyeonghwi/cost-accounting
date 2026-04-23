'use client'

export function DemoBanner() {
  return (
    <div
      data-testid="demo-banner"
      className="w-full bg-warn-bg border-b border-warn-border px-4 py-1.5 text-center text-xs tracking-[0.04em] text-warn-text"
    >
      데모 모드 — 인증 불필요
    </div>
  )
}
