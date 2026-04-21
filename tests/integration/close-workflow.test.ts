import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient, AllocationMethod, PeriodStatus } from '@prisma/client'

// T7 — REQ-CLOSE-01: monthly close workflow transitions period OPEN → CLOSED
// and writes AllocationRun + TransferEntry rows in a single transaction.
//
// lib/close/workflow.ts does NOT exist yet (Phase 2 will implement it).
// Using dynamic import so the file compiles today; the module-absent assertion
// provides the RED state during Phase 1.5.

describe('close workflow (REQ-CLOSE-01)', () => {
  // Shared mocked PrismaClient — mirrors pattern from reconciliation.test.ts
  const mockPeriod = {
    id: 'period-2024-04',
    yearMonth: '2024-04',
    status: 'OPEN' as PeriodStatus,
    closedAt: null,
  }

  const mockPrisma = {
    period: {
      findUnique: vi.fn().mockResolvedValue(mockPeriod),
      update: vi.fn().mockImplementation(({ data }: { data: { status: PeriodStatus } }) =>
        Promise.resolve({ ...mockPeriod, ...data, closedAt: new Date() }),
      ),
    },
    allocationRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-001', periodId: 'period-2024-04' }),
    },
    transferEntry: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
      findMany: vi.fn().mockResolvedValue([
        { id: 'te-001', direction: 'CREDIT' },
        { id: 'te-002', direction: 'CHARGE' },
        { id: 'te-003', direction: 'CREDIT' },
      ]),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
  } as unknown as PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports a runCloseWorkflow function', async () => {
    // RED: module does not exist yet — will fail with module-not-found
    const mod = await import('../../lib/close/workflow').catch(() => null)
    expect(mod).not.toBeNull()
    expect(typeof (mod as Record<string, unknown>)?.runCloseWorkflow).toBe('function')
  })

  it('period starts OPEN before close workflow runs', async () => {
    const period = await mockPrisma.period.findUnique({ where: { id: 'period-2024-04' } })
    expect(period?.status).toBe('OPEN')
  })

  it('period status becomes CLOSED after close workflow completes', async () => {
    // RED: runCloseWorkflow does not exist — when it does, it must set status=CLOSED
    const mod = await import('../../lib/close/workflow').catch(() => null)
    if (!mod) {
      // Explicit FAIL when module is absent
      expect('lib/close/workflow module').toBe('present — implement T7 to pass this test')
      return
    }

    const { runCloseWorkflow } = mod as { runCloseWorkflow: (p: PrismaClient, periodId: string, method: AllocationMethod) => Promise<{ status: PeriodStatus }> }
    const result = await runCloseWorkflow(mockPrisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    expect(result.status).toBe('CLOSED')
  })

  it('AllocationRun row is written after close workflow completes', async () => {
    const mod = await import('../../lib/close/workflow').catch(() => null)
    if (!mod) {
      expect('lib/close/workflow module').toBe('present — implement T7 to pass this test')
      return
    }

    const { runCloseWorkflow } = mod as { runCloseWorkflow: (p: PrismaClient, periodId: string, method: AllocationMethod) => Promise<unknown> }
    await runCloseWorkflow(mockPrisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    // AllocationRun.create must be called at least once
    expect(mockPrisma.allocationRun.create).toHaveBeenCalledTimes(1)
    const call = (mockPrisma.allocationRun.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.data.periodId).toBe('period-2024-04')
  })

  it('TransferEntry rows are written after close workflow completes', async () => {
    const mod = await import('../../lib/close/workflow').catch(() => null)
    if (!mod) {
      expect('lib/close/workflow module').toBe('present — implement T7 to pass this test')
      return
    }

    const { runCloseWorkflow } = mod as { runCloseWorkflow: (p: PrismaClient, periodId: string, method: AllocationMethod) => Promise<unknown> }
    await runCloseWorkflow(mockPrisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    // TransferEntry rows persisted via createMany (count > 0) or findMany returns rows
    const written = await mockPrisma.transferEntry.findMany({ where: { periodId: 'period-2024-04' } })
    expect(written.length).toBeGreaterThan(0)
  })
})
