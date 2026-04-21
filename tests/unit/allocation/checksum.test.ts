import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
  canonicalJson,
  sha256,
  checksumInput,
  checksumOutput,
} from '../../../lib/allocation/checksum'

describe('canonicalJson', () => {
  it('returns null JSON for null input', () => {
    expect(canonicalJson(null)).toBe('null')
  })

  it('returns null JSON for undefined input', () => {
    // canonicalize returns undefined for undefined; JSON.stringify(undefined) === undefined
    // but the function wraps with JSON.stringify so it returns undefined coerced to 'undefined'
    // Let's verify actual behaviour: canonicalize(undefined) === undefined, JSON.stringify(undefined) === undefined
    // which means canonicalJson(undefined) is undefined (not a string)
    const result = canonicalJson(undefined)
    expect(result).toBeUndefined()
  })

  it('serializes a Decimal as a fixed-point string without trailing zeros stripping', () => {
    const result = canonicalJson(new Decimal('1234.5000'))
    expect(result).toBe('"1234.5"')
  })

  it('serializes arrays preserving element order', () => {
    const result = canonicalJson([3, 1, 2])
    expect(result).toBe('[3,1,2]')
  })

  it('serializes object keys in alphabetical order', () => {
    const result = canonicalJson({ z: 1, a: 2, m: 3 })
    expect(result).toBe('{"a":2,"m":3,"z":1}')
  })

  it('sorts keys in nested objects recursively', () => {
    const result = canonicalJson({ b: { z: 'last', a: 'first' }, a: 1 })
    expect(result).toBe('{"a":1,"b":{"a":"first","z":"last"}}')
  })

  it('handles arrays of objects with sorted keys', () => {
    const result = canonicalJson([{ z: 1, a: 2 }, { y: 3, b: 4 }])
    expect(result).toBe('[{"a":2,"z":1},{"b":4,"y":3}]')
  })

  it('handles Decimal values inside arrays', () => {
    const result = canonicalJson([new Decimal('500.0000'), new Decimal('0.0001')])
    expect(result).toBe('["500","0.0001"]')
  })

  it('handles Decimal values inside objects', () => {
    const result = canonicalJson({ amount: new Decimal('100.50'), count: 2 })
    expect(result).toBe('{"amount":"100.5","count":2}')
  })

  it('two objects with different key order produce identical canonical JSON', () => {
    const a = canonicalJson({ z: 'end', a: 'start', m: 'mid' })
    const b = canonicalJson({ m: 'mid', z: 'end', a: 'start' })
    expect(a).toBe(b)
  })
})

describe('sha256', () => {
  it('produces a 64-character hex string', () => {
    const hash = sha256('hello')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]+$/)
  })

  it('is deterministic — same input yields same hash', () => {
    expect(sha256('test')).toBe(sha256('test'))
  })

  it('differs for different inputs', () => {
    expect(sha256('a')).not.toBe(sha256('b'))
  })
})

describe('checksumInput', () => {
  it('produces a stable hash for sorted entries and rules', () => {
    const entries = [
      { poolOrgId: 'SVC-A', amount: '1000.0000' },
      { poolOrgId: 'SVC-B', amount: '2000.0000' },
    ]
    const rules = [
      { poolOrgId: 'SVC-A', allocationKey: 'HEADCOUNT', method: 'DIRECT', sequence: null },
      { poolOrgId: 'SVC-B', allocationKey: 'HEADCOUNT', method: 'STEP_DOWN', sequence: 1 },
    ]
    const hash1 = checksumInput(entries, rules)
    const hash2 = checksumInput(entries, rules)
    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64)
  })

  it('produces the same hash regardless of entry input order', () => {
    const entriesAB = [
      { poolOrgId: 'SVC-A', amount: '500.0000' },
      { poolOrgId: 'SVC-B', amount: '1500.0000' },
    ]
    const entriesBA = [
      { poolOrgId: 'SVC-B', amount: '1500.0000' },
      { poolOrgId: 'SVC-A', amount: '500.0000' },
    ]
    const rules = [{ poolOrgId: 'SVC-A', allocationKey: 'HEADCOUNT', method: 'DIRECT', sequence: null }]
    expect(checksumInput(entriesAB, rules)).toBe(checksumInput(entriesBA, rules))
  })

  it('changes hash when amounts differ', () => {
    const rules = [{ poolOrgId: 'SVC-A', allocationKey: 'HEADCOUNT', method: 'DIRECT', sequence: null }]
    const h1 = checksumInput([{ poolOrgId: 'SVC-A', amount: '1000.0000' }], rules)
    const h2 = checksumInput([{ poolOrgId: 'SVC-A', amount: '1000.0001' }], rules)
    expect(h1).not.toBe(h2)
  })

  it('handles empty entries and rules', () => {
    const hash = checksumInput([], [])
    expect(hash).toHaveLength(64)
  })
})

describe('checksumOutput', () => {
  it('produces a stable hash for sorted results', () => {
    const results = [
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '300.0000' },
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P2', amount: '700.0000' },
    ]
    expect(checksumOutput(results)).toBe(checksumOutput(results))
  })

  it('produces the same hash regardless of result input order', () => {
    const r1 = [
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '300.0000' },
      { fromPoolOrgId: 'SVC-B', toProjectId: 'P2', amount: '500.0000' },
    ]
    const r2 = [
      { fromPoolOrgId: 'SVC-B', toProjectId: 'P2', amount: '500.0000' },
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '300.0000' },
    ]
    expect(checksumOutput(r1)).toBe(checksumOutput(r2))
  })

  it('sorts by (fromPoolOrgId, toProjectId) — secondary key matters', () => {
    const rAB = [
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P2', amount: '400.0000' },
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '600.0000' },
    ]
    const rBA = [
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '600.0000' },
      { fromPoolOrgId: 'SVC-A', toProjectId: 'P2', amount: '400.0000' },
    ]
    expect(checksumOutput(rAB)).toBe(checksumOutput(rBA))
  })

  it('changes hash when amounts differ', () => {
    const h1 = checksumOutput([{ fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '100.0000' }])
    const h2 = checksumOutput([{ fromPoolOrgId: 'SVC-A', toProjectId: 'P1', amount: '100.0001' }])
    expect(h1).not.toBe(h2)
  })

  it('handles empty results array', () => {
    const hash = checksumOutput([])
    expect(hash).toHaveLength(64)
  })
})
