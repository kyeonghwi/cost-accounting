import { z } from 'zod'

// ID field: schema uses cuid() — not UUID v4; permissive string avoids false rejects
export const idField = z.string().min(1, 'ID must be non-empty')

// Decimal-as-string: Prisma Decimal(18,4) requires string input to avoid float precision loss
export const decimalString = z
  .string()
  .regex(/^\d+(\.\d{1,4})?$/, 'Must be a decimal with up to 4 places')

export const positiveDecimal = decimalString.refine(
  (v) => parseFloat(v) > 0,
  'Must be positive',
)

export const dateTimeField = z.string().datetime()
