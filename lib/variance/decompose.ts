import { Decimal } from '@prisma/client/runtime/library'
import { money, Money } from '../allocation/decimal'

/**
 * Inputs for one period (actual, budget, or standard).
 * All fields are Decimal to preserve accounting precision.
 */
export interface PeriodData {
  revenue:   Decimal
  volume:    Decimal  // units sold / hours billed
  unitPrice: Decimal  // revenue per unit
  unitCost:  Decimal  // cost per unit (standard or actual)
  mix:       Decimal  // fractional composition 0..1; use 1 for single-product
}

/**
 * Result of the 4-way Kaplan/Atkinson decomposition.
 * All values are Money instances whose toString() returns 4 decimal places.
 */
export interface VarianceComponents {
  priceEffect:      Money
  volumeEffect:     Money
  mixEffect:        Money
  efficiencyEffect: Money
  totalVariance:    Money
  residual:         Money
}

/**
 * Decompose the variance between actual and budget/standard into four effects:
 *
 *   priceEffect      = (AP − SP) × AV
 *   volumeEffect     = (AV − BV) × SP
 *   mixEffect        = (AM − BM) × AV × SP
 *   efficiencyEffect = (SC − AC) × AV
 *   totalVariance    = sum of the four effects
 *   residual         = 0  (linear model has no cross-interaction terms)
 *
 * See docs/variance-algorithm.md for the full derivation and worked example.
 *
 * @param actual   - Period results as reported
 * @param budget   - Original budget (used for volume and mix baseline)
 * @param standard - Standard rates/prices (used as reference for price/cost)
 */
export function decomposeVariance(
  actual:   PeriodData,
  budget:   PeriodData,
  standard: PeriodData,
): VarianceComponents {
  // Price effect: (AP − SP) × AV
  const priceEffect = money(
    actual.unitPrice.minus(standard.unitPrice).times(actual.volume),
  )

  // Volume effect: (AV − BV) × SP
  const volumeEffect = money(
    actual.volume.minus(budget.volume).times(standard.unitPrice),
  )

  // Mix effect: (AM − BM) × AV × SP
  const mixEffect = money(
    actual.mix.minus(budget.mix).times(actual.volume).times(standard.unitPrice),
  )

  // Efficiency effect: (SC − AC) × AV
  const efficiencyEffect = money(
    standard.unitCost.minus(actual.unitCost).times(actual.volume),
  )

  // Total variance is the exact sum of the four effects (residual = 0)
  const totalVariance = money(
    new Decimal(priceEffect.toFixed(4))
      .plus(volumeEffect.toFixed(4))
      .plus(mixEffect.toFixed(4))
      .plus(efficiencyEffect.toFixed(4)),
  )

  const residual = money(new Decimal(0))

  return { priceEffect, volumeEffect, mixEffect, efficiencyEffect, totalVariance, residual }
}
