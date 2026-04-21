import { Decimal } from '@prisma/client/runtime/library'
import type { VarianceComponents } from './decompose'

/** Maximum allowed ratio of |residual| to |totalVariance|. */
const MAX_RESIDUAL_RATIO = new Decimal('0.001')

/**
 * Compute the ratio |residual| / |totalVariance|.
 *
 * Returns Decimal(0) when totalVariance is zero (no percentage check applies).
 */
export function residualRatio(components: VarianceComponents): Decimal {
  const total = components.totalVariance.abs()
  if (total.isZero()) {
    return new Decimal(0)
  }
  return components.residual.abs().div(total)
}

/**
 * Assert that the variance components reconcile within the 0.1% tolerance.
 *
 * Throws a RangeError when:
 * - totalVariance is zero but residual is non-zero, or
 * - |residual| / |totalVariance| > 0.001
 *
 * @throws {RangeError} when reconciliation fails
 */
export function assertReconciles(components: VarianceComponents): void {
  const total = components.totalVariance.abs()

  if (total.isZero()) {
    if (!components.residual.isZero()) {
      throw new RangeError(
        `Reconciliation failed: totalVariance is zero but residual is ${components.residual.toString()}`,
      )
    }
    return
  }

  const ratio = residualRatio(components)
  if (ratio.greaterThan(MAX_RESIDUAL_RATIO)) {
    throw new RangeError(
      `Reconciliation failed: residual ratio ${ratio.toFixed(6)} exceeds tolerance 0.001`,
    )
  }
}
