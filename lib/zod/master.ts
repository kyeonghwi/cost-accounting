import { z } from 'zod'
import { idField, decimalString, dateTimeField } from './_shared'

// Enum values from prisma/schema.prisma
const OrgKindEnum = z.enum(['ENTERPRISE', 'HQ', 'DEPARTMENT'])
const CostCategoryKindEnum = z.enum(['LABOR', 'OVERHEAD', 'EXTERNAL'])
const RateScopeEnum = z.enum(['PERSONNEL', 'CATEGORY'])

// Organization
export const OrganizationCreateSchema = z.object({
  name: z.string().min(1),
  kind: OrgKindEnum,
  parentId: idField.optional(),
})

export const OrganizationUpdateSchema = OrganizationCreateSchema.partial().extend({
  id: idField,
})

export const OrganizationDeleteSchema = z.object({ id: idField })

// Project
export const ProjectCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  ownerHqId: idField,
  budgetAmount: decimalString,
})

export const ProjectUpdateSchema = ProjectCreateSchema.partial().extend({ id: idField })
export const ProjectDeleteSchema = z.object({ id: idField })

// Personnel
export const PersonnelCreateSchema = z.object({
  name: z.string().min(1),
  homeHqId: idField,
  costCategoryId: idField,
})

export const PersonnelUpdateSchema = PersonnelCreateSchema.partial().extend({ id: idField })
export const PersonnelDeleteSchema = z.object({ id: idField })

// CostCategory
export const CostCategoryCreateSchema = z.object({
  code: z.string().min(1),
  kind: CostCategoryKindEnum,
})

export const CostCategoryUpdateSchema = CostCategoryCreateSchema.partial().extend({ id: idField })
export const CostCategoryDeleteSchema = z.object({ id: idField })

// StandardRate
export const StandardRateCreateSchema = z.object({
  scope: RateScopeEnum,
  targetId: idField,
  amount: decimalString,
  effectiveFrom: dateTimeField,
  effectiveTo: dateTimeField.optional(),
})

export const StandardRateUpdateSchema = StandardRateCreateSchema.partial().extend({ id: idField })
export const StandardRateDeleteSchema = z.object({ id: idField })

// Inferred types
export type OrganizationCreateInput = z.infer<typeof OrganizationCreateSchema>
export type OrganizationUpdateInput = z.infer<typeof OrganizationUpdateSchema>
export type OrganizationDeleteInput = z.infer<typeof OrganizationDeleteSchema>

export type ProjectCreateInput = z.infer<typeof ProjectCreateSchema>
export type ProjectUpdateInput = z.infer<typeof ProjectUpdateSchema>
export type ProjectDeleteInput = z.infer<typeof ProjectDeleteSchema>

export type PersonnelCreateInput = z.infer<typeof PersonnelCreateSchema>
export type PersonnelUpdateInput = z.infer<typeof PersonnelUpdateSchema>
export type PersonnelDeleteInput = z.infer<typeof PersonnelDeleteSchema>

export type CostCategoryCreateInput = z.infer<typeof CostCategoryCreateSchema>
export type CostCategoryUpdateInput = z.infer<typeof CostCategoryUpdateSchema>
export type CostCategoryDeleteInput = z.infer<typeof CostCategoryDeleteSchema>

export type StandardRateCreateInput = z.infer<typeof StandardRateCreateSchema>
export type StandardRateUpdateInput = z.infer<typeof StandardRateUpdateSchema>
export type StandardRateDeleteInput = z.infer<typeof StandardRateDeleteSchema>
