import crypto from 'crypto'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Recursively serialize a value to canonical JSON: object keys sorted
 * alphabetically, Decimals serialized as strings, arrays preserved in order.
 * Used to make checksums byte-identical across runs (REQ-ALLOC-04).
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function canonicalize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Decimal) return value.toFixed()
  if (Array.isArray(value)) return value.map(canonicalize)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const sortedKeys = Object.keys(obj).sort()
    const out: Record<string, unknown> = {}
    for (const k of sortedKeys) {
      out[k] = canonicalize(obj[k])
    }
    return out
  }
  return value
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex')
}

export interface ChecksumInputEntry {
  // The set of cost entries / pool amounts feeding the run
  poolOrgId: string
  amount: string
}

export interface ChecksumInputRule {
  poolOrgId: string
  allocationKey: string
  method: string
  sequence: number | null
}

/**
 * Compute the input checksum: a stable hash over the sorted set of pool
 * amounts and allocation rules that drive the run.
 */
// @AX:ANCHOR: [AUTO] public API contract — deterministic input checksum consumed by runner.ts and integration tests for REQ-ALLOC-04; output format is stored in DB and must remain stable across releases
// @AX:REASON: fan_in >= 3 (runner.ts, allocation-determinism.test.ts x2); changing sort order or serialization format invalidates stored checksums
export function checksumInput(
  entries: ChecksumInputEntry[],
  rules: ChecksumInputRule[],
): string {
  const sortedEntries = [...entries].sort((a, b) => a.poolOrgId.localeCompare(b.poolOrgId))
  const sortedRules = [...rules].sort((a, b) => a.poolOrgId.localeCompare(b.poolOrgId))
  return sha256(canonicalJson({ entries: sortedEntries, rules: sortedRules }))
}

export interface ChecksumOutputResult {
  fromPoolOrgId: string
  toProjectId: string
  amount: string
}

/**
 * Compute the output checksum over allocation results, sorted by
 * (fromPoolOrgId, toProjectId) so input order does not affect the digest.
 */
// @AX:ANCHOR: [AUTO] public API contract — deterministic output checksum stored in AllocationRun.outputChecksum; sort key (fromPoolOrgId, toProjectId) is the canonical ordering contract
// @AX:REASON: fan_in >= 3 (runner.ts, allocation-determinism.test.ts x2); stored digest breaks if sort or serialization changes
export function checksumOutput(results: ChecksumOutputResult[]): string {
  const sorted = [...results].sort((a, b) => {
    const c = a.fromPoolOrgId.localeCompare(b.fromPoolOrgId)
    return c !== 0 ? c : a.toProjectId.localeCompare(b.toProjectId)
  })
  return sha256(canonicalJson(sorted))
}
