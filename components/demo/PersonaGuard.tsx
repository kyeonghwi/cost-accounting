'use client'

import { usePersona, type Persona } from '@/lib/persona'

type Props = {
  allow: Persona[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Renders children only when the current persona is in the allow list.
 * Use to hide write actions for viewer persona.
 */
export function PersonaGuard({ allow, children, fallback = null }: Props) {
  const { persona } = usePersona()
  if (!allow.includes(persona)) return <>{fallback}</>
  return <>{children}</>
}
