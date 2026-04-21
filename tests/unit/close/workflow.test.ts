import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { runCloseWorkflow } from '../../../lib/close/workflow'

// Build a mock prisma client that satisfies the duck-typing guards in
// workflow.ts without exposing allocationRule or costEntry — this causes the
// guards at lines 57-65 and 91-96 to take the empty-array fast-path, avoiding
// any dependency on runner.queries or the transfer engine.
function buildMockPrisma(periodOverride?: Record<string, unknown>) {
  const mockTx = {
    allocationRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-1' }),
    },
    allocationResult: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    transferEntry: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    period: {
      update: vi.fn().mockResolvedValue({}),
    },
  }

  const prisma = {
    period: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'period-1',
        status: 'OPEN',
        ...periodOverride,
      }),
    },
    $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    _tx: mockTx,
  } as any

  return prisma
}

describe('runCloseWorkflow', () => {
  describe('validation', () => {
    it('throws when period is not found', async () => {
      const prisma = buildMockPrisma()
      prisma.period.findUnique = vi.fn().mockResolvedValue(null)

      await expect(runCloseWorkflow(prisma, 'missing', 'DIRECT')).rejects.toThrow(
        'Period not found: missing',
      )
    })

    it('throws when period is already CLOSED', async () => {
      const prisma = buildMockPrisma({ status: 'CLOSED' })

      await expect(runCloseWorkflow(prisma, 'period-1', 'DIRECT')).rejects.toThrow(
        'already CLOSED',
      )
    })
  })

  describe('happy path — DIRECT method, empty inputs', () => {
    let prisma: ReturnType<typeof buildMockPrisma>

    beforeEach(() => {
      prisma = buildMockPrisma()
    })

    it('returns status CLOSED', async () => {
      const result = await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(result.status).toBe('CLOSED')
    })

    it('returns correct periodId', async () => {
      const result = await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(result.periodId).toBe('period-1')
    })

    it('returns allocationRunId from the created run', async () => {
      const result = await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(result.allocationRunId).toBe('run-1')
    })

    it('returns transferCount of 0 when no transfer entries', async () => {
      const result = await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(result.transferCount).toBe(0)
    })

    it('calls allocationRun.create inside the transaction', async () => {
      await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(prisma._tx.allocationRun.create).toHaveBeenCalledOnce()
      const { data } = prisma._tx.allocationRun.create.mock.calls[0][0]
      expect(data.periodId).toBe('period-1')
      expect(data.method).toBe('DIRECT')
    })

    it('calls period.update with status CLOSED inside the transaction', async () => {
      await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(prisma._tx.period.update).toHaveBeenCalledOnce()
      const { data } = prisma._tx.period.update.mock.calls[0][0]
      expect(data.status).toBe('CLOSED')
      expect(data.closedAt).toBeInstanceOf(Date)
    })

    it('does not call allocationResult.createMany when there are no results', async () => {
      await runCloseWorkflow(prisma, 'period-1', 'DIRECT')
      expect(prisma._tx.allocationResult.createMany).not.toHaveBeenCalled()
    })
  })

  describe('happy path — STEP_DOWN method, empty inputs', () => {
    it('runs without error and returns CLOSED', async () => {
      const prisma = buildMockPrisma()
      const result = await runCloseWorkflow(prisma, 'period-1', 'STEP_DOWN')
      expect(result.status).toBe('CLOSED')
    })
  })

  describe('loadTransferEntries path — costEntry table exposed', () => {
    it('loads cost entries and markups, writes transferEntry rows', async () => {
      const mockTx = {
        allocationRun: { create: vi.fn().mockResolvedValue({ id: 'run-2' }) },
        allocationResult: { createMany: vi.fn().mockResolvedValue({ count: 0 }) },
        transferEntry: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        period: { update: vi.fn().mockResolvedValue({}) },
      }

      // Expose costEntry.findMany — triggers loadTransferEntries branch.
      // Use real Decimal instances so computeTransferEntries arithmetic works.
      const mockPrisma = {
        period: {
          findUnique: vi.fn().mockResolvedValue({ id: 'period-2', status: 'OPEN' }),
        },
        costEntry: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'ce-1',
              personnelId: 'pers-1',
              personnel: { homeHqId: 'hq-1' },
              projectId: 'proj-1',
              project: { ownerHqId: 'hq-2' },
              date: new Date('2024-01-15'),
              hours: new Decimal('8'),
              amount: new Decimal('100'),
              periodId: 'period-2',
            },
          ]),
        },
        transferMarkup: {
          findMany: vi.fn().mockResolvedValue([
            { fromHqId: 'hq-1', toHqId: 'hq-2', markupPct: new Decimal('0.05') },
          ]),
        },
        $transaction: vi.fn(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
        _tx: mockTx,
      } as any

      const result = await runCloseWorkflow(mockPrisma, 'period-2', 'DIRECT')
      expect(result.status).toBe('CLOSED')
      expect(result.allocationRunId).toBe('run-2')
      // transferEntry.createMany is called when transfer entries exist
      expect(mockTx.transferEntry.createMany).toHaveBeenCalled()
    })
  })
})
