import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient, AllocationMethod, PeriodStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { runCloseWorkflow } from '../../lib/close/workflow'

// T7 — REQ-CLOSE-01: monthly close workflow transitions period OPEN -> CLOSED
// and writes AllocationRun + TransferEntry rows in a single transaction.

const mockPeriod = {
  id: 'period-2024-04',
  yearMonth: '2024-04',
  status: 'OPEN' as PeriodStatus,
  closedAt: null,
}

function makeMockPrisma() {
  const base = {
    period: {
      findUnique: vi.fn().mockResolvedValue(mockPeriod),
      update: vi.fn().mockImplementation(({ data }: { data: { status: PeriodStatus } }) =>
        Promise.resolve({ ...mockPeriod, ...data, closedAt: new Date() }),
      ),
    },
    allocationRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-001', periodId: 'period-2024-04' }),
    },
    allocationResult: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    transferEntry: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(base),
    ),
  }
  return base as unknown as PrismaClient
}

describe('close workflow (REQ-CLOSE-01)', () => {
  let mockPrisma: PrismaClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma = makeMockPrisma()
  })

  it('returns status CLOSED after workflow completes', async () => {
    const result = await runCloseWorkflow(mockPrisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    expect(result.status).toBe('CLOSED')
    expect(result.periodId).toBe('period-2024-04')
    expect(result.allocationRunId).toBe('run-001')
    expect(result.snapshotCount).toBe(0)
  })

  it('writes AllocationRun with correct periodId', async () => {
    await runCloseWorkflow(mockPrisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    expect(mockPrisma.allocationRun.create).toHaveBeenCalledTimes(1)
    const call = (mockPrisma.allocationRun.create as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.data.periodId).toBe('period-2024-04')
    expect(call.data.method).toBe('DIRECT')
  })

  it('updates period status to CLOSED with OPEN guard', async () => {
    await runCloseWorkflow(mockPrisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    expect(mockPrisma.period.update).toHaveBeenCalledTimes(1)
    const call = (mockPrisma.period.update as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(call.where.status).toBe('OPEN')
    expect(call.data.status).toBe('CLOSED')
  })

  it('throws when period is not found', async () => {
    const prisma = makeMockPrisma()
    ;(prisma.period.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    await expect(
      runCloseWorkflow(prisma, 'nonexistent', 'DIRECT' as AllocationMethod),
    ).rejects.toThrow('Period not found: nonexistent')
  })

  it('throws when period is already CLOSED', async () => {
    const prisma = makeMockPrisma()
    ;(prisma.period.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockPeriod,
      status: 'CLOSED',
      closedAt: new Date(),
    })
    await expect(
      runCloseWorkflow(prisma, 'period-2024-04', 'DIRECT' as AllocationMethod),
    ).rejects.toThrow('is already CLOSED')
  })

  it('rolls back when period.update inside transaction throws (double-close guard)', async () => {
    const prisma = makeMockPrisma()
    // Simulate the Prisma P2025 error thrown when WHERE status='OPEN' finds no record
    ;(prisma.$transaction as ReturnType<typeof vi.fn>).mockRejectedValue(
      Object.assign(new Error('Record to update not found'), { code: 'P2025' }),
    )
    await expect(
      runCloseWorkflow(prisma, 'period-2024-04', 'DIRECT' as AllocationMethod),
    ).rejects.toThrow()
    // allocationRun.create is inside the transaction — not called when tx throws
    expect(prisma.allocationRun.create).not.toHaveBeenCalled()
  })
})

// Full mock with varianceSnapshot, costEntry, period.findFirst, and transferMarkup
// for REQ-PIPE-01 tests. costEntry shape satisfies both loadTransferEntries (outer
// prisma) and createVarianceSnapshots (tx-level call).
function makeMockPrismaFull() {
  // Same-HQ entries (personnel homeHqId === project ownerHqId) avoid cross-HQ
  // transfer markup lookups so transferMarkup can safely return [].
  const costEntryRows = [
    {
      id: 'ce-1',
      personnelId: 'p-1',
      projectId: 'proj-1',
      periodId: 'period-2024-04',
      date: new Date('2024-04-15'),
      hours: new Decimal('8'),
      amount: new Decimal('400'),
      personnel: { homeHqId: 'hq-1', homeHq: { name: 'Alpha HQ' } },
      project: { ownerHqId: 'hq-1' },
    },
    {
      id: 'ce-2',
      personnelId: 'p-2',
      projectId: 'proj-2',
      periodId: 'period-2024-04',
      date: new Date('2024-04-16'),
      hours: new Decimal('4'),
      amount: new Decimal('200'),
      personnel: { homeHqId: 'hq-2', homeHq: { name: 'Beta HQ' } },
      project: { ownerHqId: 'hq-2' },
    },
  ]

  const base = {
    period: {
      findUnique: vi.fn().mockResolvedValue(mockPeriod),
      update: vi.fn().mockImplementation(({ data }: { data: { status: PeriodStatus } }) =>
        Promise.resolve({ ...mockPeriod, ...data, closedAt: new Date() }),
      ),
      findFirst: vi.fn().mockResolvedValue(null), // no previous CLOSED period
    },
    allocationRun: {
      create: vi.fn().mockResolvedValue({ id: 'run-001', periodId: 'period-2024-04' }),
    },
    allocationResult: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    transferEntry: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    costEntry: {
      findMany: vi.fn().mockResolvedValue(costEntryRows),
    },
    transferMarkup: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    varianceSnapshot: {
      createMany: vi.fn().mockResolvedValue({ count: 3 }),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(base),
    ),
  }
  return base as unknown as PrismaClient
}

describe('VarianceSnapshot integration (REQ-PIPE-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns snapshotCount = 0 when tx lacks varianceSnapshot table', async () => {
    const prisma = makeMockPrisma()
    const result = await runCloseWorkflow(prisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    expect(result.snapshotCount).toBe(0)
  })

  it('returns snapshotCount > 0 when tx exposes varianceSnapshot table', async () => {
    const prisma = makeMockPrismaFull()
    const result = await runCloseWorkflow(prisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    expect(result.snapshotCount).toBe(3)
  })

  it('calls varianceSnapshot.createMany inside the same transaction', async () => {
    const prisma = makeMockPrismaFull()
    await runCloseWorkflow(prisma, 'period-2024-04', 'DIRECT' as AllocationMethod)
    const base = prisma as unknown as ReturnType<typeof makeMockPrismaFull>
    const createMany = (base as { varianceSnapshot: { createMany: ReturnType<typeof vi.fn> } })
      .varianceSnapshot.createMany
    expect(createMany).toHaveBeenCalledTimes(1)
    const callArg = createMany.mock.calls[0][0] as { data: Array<{ scope: string }> }
    const enterpriseRow = callArg.data.find((row) => row.scope === 'enterprise')
    expect(enterpriseRow).toBeDefined()
  })
})
