import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logAudit } from '../../../lib/audit'

describe('logAudit', () => {
  let mockCreate: ReturnType<typeof vi.fn>
  let mockPrisma: any

  beforeEach(() => {
    mockCreate = vi.fn().mockResolvedValue(undefined)
    mockPrisma = {
      auditLog: { create: mockCreate },
    }
  })

  it('calls prisma.auditLog.create with the correct shape', async () => {
    const before = { status: 'OPEN' }
    const after = { status: 'CLOSED' }

    await logAudit(mockPrisma, 'Period', 'UPDATE', 'period-1', before, after)

    expect(mockCreate).toHaveBeenCalledOnce()
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        entityType: 'Period',
        entityId: 'period-1',
        action: 'UPDATE',
        before,
        after,
        actorPersona: 'system',
      },
    })
  })

  it('accepts CREATE action', async () => {
    await logAudit(mockPrisma, 'Project', 'CREATE', 'proj-42')
    expect(mockCreate).toHaveBeenCalledOnce()
    const { data } = mockCreate.mock.calls[0][0]
    expect(data.action).toBe('CREATE')
    expect(data.entityType).toBe('Project')
    expect(data.entityId).toBe('proj-42')
  })

  it('accepts DELETE action', async () => {
    await logAudit(mockPrisma, 'CostEntry', 'DELETE', 'entry-7')
    expect(mockCreate).toHaveBeenCalledOnce()
    const { data } = mockCreate.mock.calls[0][0]
    expect(data.action).toBe('DELETE')
  })

  it('uses custom actorPersona when provided', async () => {
    await logAudit(mockPrisma, 'Period', 'UPDATE', 'p1', undefined, undefined, 'accountant')
    const { data } = mockCreate.mock.calls[0][0]
    expect(data.actorPersona).toBe('accountant')
  })

  it('defaults actorPersona to "system" when omitted', async () => {
    await logAudit(mockPrisma, 'Period', 'UPDATE', 'p1')
    const { data } = mockCreate.mock.calls[0][0]
    expect(data.actorPersona).toBe('system')
  })

  it('handles missing before — passes undefined, not null', async () => {
    await logAudit(mockPrisma, 'Period', 'CREATE', 'p1', undefined, { status: 'OPEN' })
    const { data } = mockCreate.mock.calls[0][0]
    expect(data.before).toBeUndefined()
    expect(data.after).toEqual({ status: 'OPEN' })
  })

  it('handles missing after — passes undefined, not null', async () => {
    await logAudit(mockPrisma, 'Period', 'DELETE', 'p1', { status: 'CLOSED' }, undefined)
    const { data } = mockCreate.mock.calls[0][0]
    expect(data.after).toBeUndefined()
    expect(data.before).toEqual({ status: 'CLOSED' })
  })

  it('no-ops silently when prisma throws — does not propagate the error', async () => {
    mockCreate.mockRejectedValue(new Error('DB unavailable'))

    // Must not throw
    await expect(
      logAudit(mockPrisma, 'Period', 'UPDATE', 'p1'),
    ).resolves.toBeUndefined()
  })

  it('returns void (undefined) on success', async () => {
    const result = await logAudit(mockPrisma, 'Period', 'UPDATE', 'p1')
    expect(result).toBeUndefined()
  })
})
