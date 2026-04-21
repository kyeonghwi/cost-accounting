import { OrgKind } from '@prisma/client'

interface OrgRef {
  id: string
  kind: OrgKind
  parentId: string | null
}

/**
 * Resolve the HQ ancestor id for a given organization node.
 * If the org itself is HQ, returns its own id.
 * If it is a DEPARTMENT, returns its parent id (parent must be an HQ).
 * If it is an ENTERPRISE or has no recognized HQ ancestor, returns null.
 */
export function resolveHqId(org: OrgRef): string | null {
  if (org.kind === OrgKind.HQ) {
    return org.id
  }
  if (org.kind === OrgKind.DEPARTMENT && org.parentId !== null) {
    return org.parentId
  }
  return null
}
