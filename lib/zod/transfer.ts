import { z } from 'zod'
import { idField, decimalString, dateTimeField } from './_shared'

export const TransferMarkupCreateSchema = z.object({
  fromHqId: idField,
  toHqId: idField,
  markupPct: decimalString,
  effectiveFrom: dateTimeField,
  effectiveTo: dateTimeField.optional(),
})

export const TransferMarkupUpdateSchema = TransferMarkupCreateSchema.partial().extend({
  id: idField,
})

export const TransferMarkupDeleteSchema = z.object({
  id: idField,
})

export type TransferMarkupCreateInput = z.infer<typeof TransferMarkupCreateSchema>
export type TransferMarkupUpdateInput = z.infer<typeof TransferMarkupUpdateSchema>
export type TransferMarkupDeleteInput = z.infer<typeof TransferMarkupDeleteSchema>
