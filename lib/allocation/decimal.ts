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

  // Arithmetic operations that return Money so callers retain the fixed-scale toString.
  override plus(n: Decimal.Value): Money {
    return new Money(super.plus(n).toFixed(MONEY_SCALE))
  }

  override minus(n: Decimal.Value): Money {
    return new Money(super.minus(n).toFixed(MONEY_SCALE))
  }

  override times(n: Decimal.Value): Money {
    return new Money(super.times(n).toFixed(MONEY_SCALE))
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

// Patch Decimal.prototype.plus so Money propagates through reduce-style accumulations
// where the initial accumulator may be a plain `new Decimal('0')`.
// Only activates when at least one operand is a Money instance.
const _decPlus = Decimal.prototype.plus;
(Decimal.prototype as any).plus = function (this: Decimal, n: Decimal.Value): Decimal {
  const result = _decPlus.call(this, n) as Decimal;
  if (this instanceof Money || (typeof n === 'object' && n !== null && n instanceof Money)) {
    return new Money(result.toFixed(MONEY_SCALE));
  }
  return result;
};

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
