'use client'

import { createContext, useContext, useEffect, useState } from 'react'

export type Persona = 'accountant' | 'analyst' | 'viewer'

export const PERSONAS: Persona[] = ['accountant', 'analyst', 'viewer']

export const PERSONA_LABELS: Record<Persona, string> = {
  accountant: 'Cost Accountant',
  analyst: 'Financial Analyst',
  viewer: 'View Only',
}

// @AX:NOTE: [AUTO] magic constants — STORAGE_KEY is the localStorage key for persona persistence; DEFAULT_PERSONA sets the fallback when no stored value exists
const STORAGE_KEY = 'demo-persona'
const DEFAULT_PERSONA: Persona = 'accountant'

interface PersonaContextValue {
  persona: Persona
  setPersona: (p: Persona) => void
}

// @AX:ANCHOR: [AUTO] persona context — fan_in: PersonaProvider, usePersona (PersonaSwitcher), layout.tsx; all role-based UI reads flow through this context
export const PersonaContext = createContext<PersonaContextValue>({
  persona: DEFAULT_PERSONA,
  setPersona: () => undefined,
})

export function PersonaProvider({ children }: { children: React.ReactNode }) {
  const [persona, setPersonaState] = useState<Persona>(DEFAULT_PERSONA)

  // @AX:NOTE: [AUTO] localStorage read is deferred to useEffect to avoid SSR hydration mismatch; initial render always uses DEFAULT_PERSONA
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && PERSONAS.includes(stored as Persona)) {
      setPersonaState(stored as Persona)
    }
  }, [])

  // @AX:WARN: [AUTO] localStorage mutation in render-phase callback — safe only in 'use client' components; calling setPersona during SSR will throw ReferenceError
  function setPersona(p: Persona) {
    setPersonaState(p)
    localStorage.setItem(STORAGE_KEY, p)
  }

  return (
    <PersonaContext.Provider value={{ persona, setPersona }}>
      {children}
    </PersonaContext.Provider>
  )
}

export function usePersona(): PersonaContextValue {
  return useContext(PersonaContext)
}
