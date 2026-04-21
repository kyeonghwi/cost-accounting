import { Decimal } from '@prisma/client/runtime/library'

// Configure Decimal precision and rounding mode globally for the allocation engine.
// ROUND_HALF_UP (4) is the conventional accounting rounding mode.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP })

// Standard scale for monetary values throughout the engine (matches Prisma @db.Decimal(18, 4))
export const MONEY_SCALE = 4

/**
 * Money is a Decimal subclass that preserves the configured monetary scale
 * (4 decimal places) when serialized via toString(). The underlying Decimal
 * arithmetic is unchanged; only display is affected so allocation amounts
 * round-trip through string IO with stable scale.
 */
export class Money extends Decimal {
  override toString(): string {
    return this.toFixed(MONEY_SCALE)
  }
}

/**
 * Construct a Money value from any Decimal-compatible input, quantized to
 * MONEY_SCALE using ROUND_HALF_UP.
 */
export function money(value: Decimal | string | number): Money {
  const d = value instanceof Decimal ? value : new Decimal(value)
  const quantized = d.toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_UP)
  return new Money(quantized.toFixed(MONEY_SCALE))
}

export const zero = (): Decimal => new Decimal(0)

export const add = (a: Decimal, b: Decimal): Decimal => a.plus(b)
export const sub = (a: Decimal, b: Decimal): Decimal => a.minus(b)
export const mul = (a: Decimal, b: Decimal): Decimal => a.times(b)
export const div = (a: Decimal, b: Decimal): Decimal => a.dividedBy(b)

export const sum = (values: Decimal[]): Decimal =>
  values.reduce((acc, v) => acc.plus(v), zero())

/**
 * Quantize a Decimal value to the standard monetary scale using ROUND_HALF_UP,
 * returning a Money instance whose toString() preserves trailing zeros.
 */
export const toMoney = (value: Decimal): Money => money(value)

/**
 * Redistribute residual rounding difference into the last allocated bucket so
 * that sum(allocated) === pool exactly.
 *
 * Each input value is first quantized to MONEY_SCALE; the difference between
 * the quantized sum and the pool is added to the last bucket. This guarantees
 * the post-condition without changing the relative proportions of earlier
 * buckets (within rounding tolerance).
 */
export function lastStepAdjust(pool: Decimal, allocated: Decimal[]): Money[] {
  if (allocated.length === 0) return []
  const quantized = allocated.map(toMoney)
  const totalQuantized = sum(quantized)
  const residual = pool.minus(totalQuantized)
  if (residual.isZero()) return quantized
  const adjusted: Money[] = [...quantized]
  const lastIdx = adjusted.length - 1
  adjusted[lastIdx] = toMoney(adjusted[lastIdx].plus(residual))
  return adjusted
}
