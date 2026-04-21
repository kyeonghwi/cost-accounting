import { z } from 'zod'
import { idField } from './_shared'

// Enum values from prisma/schema.prisma
export const AllocationKeyEnum = z.enum(['HEADCOUNT', 'DIRECT_LABOR_HOURS', 'DIRECT_COST'])
export const AllocationMethodEnum = z.enum(['DIRECT', 'STEP_DOWN'])

// AllocationRun: trigger schema for running an allocation pass
export const AllocationRunSchema = z.object({
  periodId: idField,
  method: AllocationMethodEnum,
})

// AllocationRule CRUD
export const AllocationRuleCreateSchema = z.object({
  poolOrgId: idField,
  allocationKey: AllocationKeyEnum,
  method: AllocationMethodEnum,
  sequence: z.number().int().nonnegative().optional(),
})

export const AllocationRuleUpdateSchema = AllocationRuleCreateSchema.partial().extend({
  id: idField,
})

export const AllocationRuleDeleteSchema = z.object({
  id: idField,
})

export type AllocationRunInput = z.infer<typeof AllocationRunSchema>
export type AllocationRuleCreateInput = z.infer<typeof AllocationRuleCreateSchema>
export type AllocationRuleUpdateInput = z.infer<typeof AllocationRuleUpdateSchema>
export type AllocationRuleDeleteInput = z.infer<typeof AllocationRuleDeleteSchema>
