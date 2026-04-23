import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { resolveMarkup } from '../../../lib/transfer/rate'

const markup = (from: string, to: string, pct: string) => ({
  fromHqId: from,
  toHqId: to,
  markupPct: new Decimal(pct),
})

describe('resolveMarkup', () => {
  it('returns the matching markupPct for a known HQ pair', () => {
    const result = resolveMarkup('HQ-A', 'HQ-B', [markup('HQ-A', 'HQ-B', '0.15')])
    expect(result.toString()).toBe('0.15')
  })

  it('throws with the exact error message format for a missing pair (REQ-TP-03)', () => {
    expect(() => resolveMarkup('HQ-A', 'HQ-X', [])).toThrow(
      'No transfer markup configured for pair HQ-A → HQ-X',
    )
  })

  it('selects the correct pair when multiple markups exist', () => {
    const markups = [
      markup('HQ-A', 'HQ-B', '0.10'),
      markup('HQ-B', 'HQ-C', '0.20'),
      markup('HQ-A', 'HQ-C', '0.25'),
    ]
    expect(resolveMarkup('HQ-B', 'HQ-C', markups).toFixed(2)).toBe('0.20')
    expect(resolveMarkup('HQ-A', 'HQ-C', markups).toFixed(2)).toBe('0.25')
  })
})
