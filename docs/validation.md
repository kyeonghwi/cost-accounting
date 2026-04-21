# Validation Layer — lib/zod/

## Why decimal-as-string, not number

Prisma maps `Decimal(18,4)` columns to the `Decimal` type from the `decimal.js` library. JavaScript's `number` type (IEEE 754 double) cannot represent all 18-digit integers or 4-decimal-place fractional values without precision loss. For example, `0.1 + 0.2 === 0.30000000000000004` in JS.

Accepting only strings matching `/^\d+(\.\d{1,4})?$/` at the API boundary means:
- No float rounding error enters the system before reaching Prisma
- The regex enforces the 4-decimal-place contract at the entry point
- Callers must convert numbers to strings (`amount.toFixed(4)`) before submitting

## The z.infer pattern

Each schema exports a TypeScript type derived directly from the schema definition:

```typescript
export const CostEntryCreateSchema = z.object({ ... })
export type CostEntryCreateInput = z.infer<typeof CostEntryCreateSchema>
```

`CostEntryCreateInput` is structurally identical to what `safeParse` returns on success. Server actions receive this type after validation — no separate DTO type needed.

## Example: CostEntryCreateSchema → CostEntryCreateInput

```typescript
import { CostEntryCreateSchema, CostEntryCreateInput } from '@/lib/zod/costEntry'

async function createCostEntry(raw: unknown) {
  const parsed = CostEntryCreateSchema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.flatten() }
  }
  const data: CostEntryCreateInput = parsed.data
  // data.hours is string "8.0000", not number 8
  return prisma.costEntry.create({ data })
}
```

## Where schemas are consumed

| Schema file | Consumed by |
|-------------|-------------|
| `lib/zod/costEntry.ts` | `app/(master)/cost-entries/actions.ts` |
| `lib/zod/allocation.ts` | `app/(close)/actions.ts` (run + rule management) |
| `lib/zod/transfer.ts` | `app/(master)/transfer-markup/actions.ts` |
| `lib/zod/master.ts` | `app/(master)/*/actions.ts` (org, project, personnel, etc.) |
| `lib/zod/period.ts` | `app/(close)/actions.ts` (period close gate) |

Wire these in T7/T10. Each server action follows the `safeParse → early return error → prisma call` pattern shown above.

## ID field note

Prisma uses `cuid()` for all `@id` fields. CUIDs start with `c` and are ~25 characters. The `idField` helper uses `z.string().min(1)` rather than `z.string().uuid()` to accept both CUIDs and any future UUID migration without breaking the validation layer.
