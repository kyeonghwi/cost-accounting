'use client'

import { PERSONAS, PERSONA_LABELS, usePersona } from '@/lib/persona'

export function PersonaSwitcher() {
  const { persona, setPersona } = usePersona()

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-500">Viewing as:</span>
      <select
        value={persona}
        onChange={(e) => setPersona(e.target.value as typeof persona)}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
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
