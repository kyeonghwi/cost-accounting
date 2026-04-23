import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { computeTransferEntries } from '../../../lib/transfer/engine'

// Inline type stubs
interface CostEntry {
  id: string
  personnelId: string
  personnelHomeHqId: string
  projectId: string
  projectOwnerHqId: string
  date: Date
  hours: Decimal
  standardHourlyRate: Decimal
  periodId: string
}

interface TransferMarkup {
  fromHqId: string
  toHqId: string
  markupPct: Decimal
}

interface TransferEntry {
  fromHqId: string
  toHqId: string
  personnelId: string
  hours: Decimal
  standardRate: Decimal
  markupPct: Decimal
  amount: Decimal
  direction: 'CREDIT' | 'CHARGE'
}

const jan1 = new Date('2024-01-15')

describe('computeTransferEntries', () => {
  it('should generate no TransferEntry when person and project belong to the same HQ', () => {
    const entries: CostEntry[] = [
      {
        id: 'ce-1',
        personnelId: 'person-1',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-1',
        projectOwnerHqId: 'HQ-A',
        date: jan1,
        hours: new Decimal('8'),
        standardHourlyRate: new Decimal('100'),
        periodId: 'period-1',
      },
    ]
    const markups: TransferMarkup[] = []
    const result: TransferEntry[] = computeTransferEntries(entries, markups)
    expect(result).toHaveLength(0)
  })

  it('should generate CREDIT on source HQ and CHARGE on destination HQ for cross-HQ entry', () => {
    const entries: CostEntry[] = [
      {
        id: 'ce-2',
        personnelId: 'person-2',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-b',
        projectOwnerHqId: 'HQ-B',
        date: jan1,
        hours: new Decimal('10'),
        standardHourlyRate: new Decimal('200'),
        periodId: 'period-1',
      },
    ]
    const markups: TransferMarkup[] = [
      { fromHqId: 'HQ-A', toHqId: 'HQ-B', markupPct: new Decimal('0.15') },
    ]
    const result: TransferEntry[] = computeTransferEntries(entries, markups)
    // Exactly one CREDIT and one CHARGE
    expect(result).toHaveLength(2)
    const credit = result.find((r) => r.direction === 'CREDIT')!
    const charge = result.find((r) => r.direction === 'CHARGE')!
    expect(credit).toBeDefined()
    expect(charge).toBeDefined()
    expect(credit.fromHqId).toBe('HQ-A')
    expect(charge.toHqId).toBe('HQ-B')
    // Amount = hours * rate * (1 + markup) = 10 * 200 * 1.15 = 2300
    expect(credit.amount.toString()).toBe('2300.0000')
    expect(charge.amount.toString()).toBe('2300.0000')
    expect(credit.personnelId).toBe('person-2')
    expect(charge.personnelId).toBe('person-2')
  })

  it('should satisfy symmetry: total credits equal total charges across all entries', () => {
    const entries: CostEntry[] = [
      {
        id: 'ce-3',
        personnelId: 'person-3',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-b1',
        projectOwnerHqId: 'HQ-B',
        date: jan1,
        hours: new Decimal('5'),
        standardHourlyRate: new Decimal('100'),
        periodId: 'period-1',
      },
      {
        id: 'ce-4',
        personnelId: 'person-4',
        personnelHomeHqId: 'HQ-B',
        projectId: 'proj-c1',
        projectOwnerHqId: 'HQ-C',
        date: jan1,
        hours: new Decimal('8'),
        standardHourlyRate: new Decimal('150'),
        periodId: 'period-1',
      },
    ]
    const markups: TransferMarkup[] = [
      { fromHqId: 'HQ-A', toHqId: 'HQ-B', markupPct: new Decimal('0.10') },
      { fromHqId: 'HQ-B', toHqId: 'HQ-C', markupPct: new Decimal('0.10') },
    ]
    const result: TransferEntry[] = computeTransferEntries(entries, markups)
    const totalCredits = result
      .filter((r) => r.direction === 'CREDIT')
      .reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    const totalCharges = result
      .filter((r) => r.direction === 'CHARGE')
      .reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(totalCredits.equals(totalCharges)).toBe(true)
  })

  it('should apply per-pair markup: HQ-A→HQ-B at 15%, HQ-B→HQ-C at 20%', () => {
    const entries: CostEntry[] = [
      {
        id: 'ce-5',
        personnelId: 'person-5',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-b2',
        projectOwnerHqId: 'HQ-B',
        date: jan1,
        hours: new Decimal('10'),
        standardHourlyRate: new Decimal('100'),
        periodId: 'period-1',
      },
      {
        id: 'ce-6',
        personnelId: 'person-6',
        personnelHomeHqId: 'HQ-B',
        projectId: 'proj-c2',
        projectOwnerHqId: 'HQ-C',
        date: jan1,
        hours: new Decimal('10'),
        standardHourlyRate: new Decimal('100'),
        periodId: 'period-1',
      },
    ]
    const markups: TransferMarkup[] = [
      { fromHqId: 'HQ-A', toHqId: 'HQ-B', markupPct: new Decimal('0.15') },
      { fromHqId: 'HQ-B', toHqId: 'HQ-C', markupPct: new Decimal('0.20') },
    ]
    const result: TransferEntry[] = computeTransferEntries(entries, markups)
    const abCredit = result.find(
      (r) => r.direction === 'CREDIT' && r.fromHqId === 'HQ-A' && r.toHqId === 'HQ-B'
    )!
    const bcCredit = result.find(
      (r) => r.direction === 'CREDIT' && r.fromHqId === 'HQ-B' && r.toHqId === 'HQ-C'
    )!
    // HQ-A→HQ-B: 10 * 100 * 1.15 = 1150
    expect(abCredit.amount.toString()).toBe('1150.0000')
    // HQ-B→HQ-C: 10 * 100 * 1.20 = 1200
    expect(bcCredit.amount.toString()).toBe('1200.0000')
  })

  it('should throw when no markup row exists for a cross-HQ pair', () => {
    const entries: CostEntry[] = [
      {
        id: 'ce-7',
        personnelId: 'person-7',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-d',
        projectOwnerHqId: 'HQ-D',
        date: jan1,
        hours: new Decimal('4'),
        standardHourlyRate: new Decimal('100'),
        periodId: 'period-1',
      },
    ]
    // No markup for HQ-A → HQ-D
    const markups: TransferMarkup[] = []
    expect(() => computeTransferEntries(entries, markups)).toThrow()
  })

  it('should produce correct entries for multiple entries spanning a partial month', () => {
    const entries: CostEntry[] = [
      {
        id: 'ce-8a',
        personnelId: 'person-8',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-b3',
        projectOwnerHqId: 'HQ-B',
        date: new Date('2024-01-05'),
        hours: new Decimal('3'),
        standardHourlyRate: new Decimal('200'),
        periodId: 'period-1',
      },
      {
        id: 'ce-8b',
        personnelId: 'person-8',
        personnelHomeHqId: 'HQ-A',
        projectId: 'proj-b3',
        projectOwnerHqId: 'HQ-B',
        date: new Date('2024-01-20'),
        hours: new Decimal('5'),
        standardHourlyRate: new Decimal('200'),
        periodId: 'period-1',
      },
    ]
    const markups: TransferMarkup[] = [
      { fromHqId: 'HQ-A', toHqId: 'HQ-B', markupPct: new Decimal('0.10') },
    ]
    const result: TransferEntry[] = computeTransferEntries(entries, markups)
    // 2 entries × 2 directions = 4 rows
    expect(result).toHaveLength(4)
    const credits = result.filter((r) => r.direction === 'CREDIT')
    const charges = result.filter((r) => r.direction === 'CHARGE')
    expect(credits).toHaveLength(2)
    expect(charges).toHaveLength(2)
    // Total: (3 + 5) * 200 * 1.10 = 1760
    const totalCredit = credits.reduce((acc, r) => acc.plus(r.amount), new Decimal('0'))
    expect(totalCredit.toString()).toBe('1760.0000')
  })
})
