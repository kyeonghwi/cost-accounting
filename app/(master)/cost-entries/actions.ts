'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { z } from 'zod'
import { idField, dateTimeField, positiveDecimal } from '@/lib/zod/_shared'
import { Decimal } from '@prisma/client/runtime/library'

// Form-level schema — amount is derived, periodId resolved from date
const CostEntryFormSchema = z.object({
  personnelId: idField,
  projectId: idField,
  date: dateTimeField,
  hours: positiveDecimal,
})

export type CostEntryFormError = { message: string }

/**
 * Resolve or create the Period for the given ISO date string.
 * yearMonth format: "YYYY-MM"
 */
async function resolvePeriod(dateIso: string) {
  const yearMonth = dateIso.slice(0, 7) // "2026-04"
  return prisma.period.upsert({
    where: { yearMonth },
    // Demo mode: auto-create OPEN period for new months
    create: { yearMonth, status: 'OPEN' },
    update: {},
  })
}

/**
 * Look up the active StandardRate for personnel on a given date.
 * Priority: PERSONNEL scope → CATEGORY scope.
 * Returns null when no rate is found.
 */
async function resolveRate(personnelId: string, dateIso: string): Promise<Decimal | null> {
  const at = new Date(dateIso)

  // Try PERSONNEL scope first
  const byPerson = await prisma.standardRate.findFirst({
    where: {
      scope: 'PERSONNEL',
      targetId: personnelId,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })
  if (byPerson) return byPerson.amount

  // Fall back to CATEGORY scope
  const person = await prisma.personnel.findUnique({ where: { id: personnelId } })
  if (!person) return null

  const byCat = await prisma.standardRate.findFirst({
    where: {
      scope: 'CATEGORY',
      targetId: person.costCategoryId,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
    },
    orderBy: { effectiveFrom: 'desc' },
  })
  return byCat?.amount ?? null
}

export async function createCostEntry(
  formData: FormData,
): Promise<CostEntryFormError | null> {
  const raw = {
    personnelId: formData.get('personnelId'),
    projectId: formData.get('projectId'),
    date: formData.get('date'),
    hours: formData.get('hours'),
  }

  const result = CostEntryFormSchema.safeParse(raw)
  if (!result.success) {
    return { message: result.error.errors[0]?.message ?? 'Validation error' }
  }

  const { personnelId, projectId, date, hours } = result.data

  // Resolve period and check it is open
  const period = await resolvePeriod(date)
  if (period.status === 'CLOSED') {
    return { message: `Period ${period.yearMonth} is CLOSED — cost entries are not allowed.` }
  }

  // Resolve rate and compute amount
  const rate = await resolveRate(personnelId, date)
  if (!rate) {
    return { message: 'No active standard rate found for this personnel on the given date.' }
  }

  const hoursDecimal = new Decimal(hours)
  const amount = hoursDecimal.mul(rate)

  const entry = await prisma.costEntry.create({
    data: {
      personnelId,
      projectId,
      periodId: period.id,
      date: new Date(date),
      hours: hoursDecimal,
      amount,
    },
  })

  await logAudit(prisma, 'CostEntry', 'CREATE', entry.id, undefined, {
    personnelId,
    projectId,
    periodId: period.id,
    date,
    hours,
    amount: amount.toString(),
  })

  revalidatePath('/cost-entries')
  return null
}
