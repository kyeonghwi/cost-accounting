import { z } from 'zod'
import { idField, dateTimeField, positiveDecimal, decimalString } from './_shared'

// CostEntry.date is DateTime in Prisma — accept ISO 8601 datetime string
export const CostEntryCreateSchema = z.object({
  personnelId: idField,
  projectId: idField,
  periodId: idField,
  date: dateTimeField,
  hours: positiveDecimal,
  amount: decimalString,
})

export const CostEntryUpdateSchema = CostEntryCreateSchema.partial().extend({
  id: idField,
})

export const CostEntryDeleteSchema = z.object({
  id: idField,
})

export type CostEntryCreateInput = z.infer<typeof CostEntryCreateSchema>
export type CostEntryUpdateInput = z.infer<typeof CostEntryUpdateSchema>
export type CostEntryDeleteInput = z.infer<typeof CostEntryDeleteSchema>
