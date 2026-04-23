'use client'

import { PERSONAS, PERSONA_LABELS, usePersona } from '@/lib/persona'

export function PersonaSwitcher() {
  const { persona, setPersona } = usePersona()

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-3">현재 역할:</span>
      <select
        value={persona}
        onChange={(e) => setPersona(e.target.value as typeof persona)}
        className="rounded border border-border bg-surface px-2 py-1 text-xs text-text-1 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent hover:border-border-strong transition-colors"
        aria-label="Switch persona"
      >
        {PERSONAS.map((p) => (
          <option key={p} value={p}>
            {PERSONA_LABELS[p]}
          </option>
        ))}
      </select>
    </div>
  )
}
