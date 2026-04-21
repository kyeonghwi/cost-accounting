import { z } from 'zod'
import { idField } from './_shared'

export const PeriodCloseSchema = z.object({
  periodId: idField,
})

export type PeriodCloseInput = z.infer<typeof PeriodCloseSchema>
