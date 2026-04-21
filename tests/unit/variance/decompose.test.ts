import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import { decomposeVariance } from '../../../lib/variance/decompose'

// Inline type stubs
interface PeriodData {
  revenue: Decimal
  volume: Decimal     // units sold / hours billed
  unitPrice: Decimal  // revenue per unit
  unitCost: Decimal   // standard or actual cost per unit
  mix: Decimal        // fractional composition (0..1) for multi-product; 1 for single
}

interface VarianceComponents {
  priceEffect: Decimal
  volumeEffect: Decimal
  mixEffect: Decimal
  efficiencyEffect: Decimal
  totalVariance: Decimal
  residual: Decimal
}

// Helper to build PeriodData from simple numbers
function pd(revenue: string, volume: string, unitPrice: string, unitCost: string, mix = '1'): PeriodData {
  return {
    revenue: new Decimal(revenue),
    volume: new Decimal(volume),
    unitPrice: new Decimal(unitPrice),
    unitCost: new Decimal(unitCost),
    mix: new Decimal(mix),
  }
}

describe('decomposeVariance', () => {
  it('should return all-zero effects when actual equals budget and standard', () => {
    const base = pd('10000', '100', '100', '60')
    const result: VarianceComponents = decomposeVariance(base, base, base)
    expect(result.priceEffect.isZero()).toBe(true)
    expect(result.volumeEffect.isZero()).toBe(true)
    expect(result.mixEffect.isZero()).toBe(true)
    expect(result.efficiencyEffect.isZero()).toBe(true)
    expect(result.totalVariance.isZero()).toBe(true)
    expect(result.residual.isZero()).toBe(true)
  })

  it('should isolate price-only variance when volume and mix are held constant', () => {
    const budget = pd('10000', '100', '100', '60')
    const standard = pd('10000', '100', '100', '60')
    // Actual: same volume, same mix, price increased by 10
    const actual = pd('11000', '100', '110', '60')
    const result: VarianceComponents = decomposeVariance(actual, budget, standard)
    // Price effect = (actualPrice - standardPrice) * actualVolume = (110 - 100) * 100 = 1000
    expect(result.priceEffect.toString()).toBe('1000.0000')
    expect(result.volumeEffect.isZero()).toBe(true)
    expect(result.mixEffect.isZero()).toBe(true)
    expect(result.efficiencyEffect.isZero()).toBe(true)
    const sumEffects = result.priceEffect
      .plus(result.volumeEffect)
      .plus(result.mixEffect)
      .plus(result.efficiencyEffect)
    expect(sumEffects.equals(result.totalVariance)).toBe(true)
  })

  it('should isolate volume-only variance when price and mix are held constant', () => {
    const budget = pd('10000', '100', '100', '60')
    const standard = pd('10000', '100', '100', '60')
    // Actual: more volume, same price and mix
    const actual = pd('12000', '120', '100', '60')
    const result: VarianceComponents = decomposeVariance(actual, budget, standard)
    // Volume effect = (actualVol - budgetVol) * standardPrice = (120 - 100) * 100 = 2000
    expect(result.volumeEffect.toString()).toBe('2000.0000')
    expect(result.priceEffect.isZero()).toBe(true)
    expect(result.mixEffect.isZero()).toBe(true)
    expect(result.efficiencyEffect.isZero()).toBe(true)
  })

  it('should isolate mix-only variance when price, volume, and efficiency are held constant', () => {
    // Mix variance requires multi-product setup: budget mix differs from actual mix
    const budget = pd('10000', '100', '100', '60', '0.5')
    const standard = pd('10000', '100', '100', '60', '0.5')
    // Actual: same total volume, same price, but different mix (0.7 vs 0.5)
    const actual = pd('10000', '100', '100', '60', '0.7')
    const result: VarianceComponents = decomposeVariance(actual, budget, standard)
    // Mix effect is non-zero; price and volume effects are zero
    expect(result.priceEffect.isZero()).toBe(true)
    expect(result.volumeEffect.isZero()).toBe(true)
    expect(result.mixEffect.isZero()).toBe(false)
    expect(result.efficiencyEffect.isZero()).toBe(true)
  })

  it('should isolate efficiency-only variance when price, volume, and mix are held constant', () => {
    const budget = pd('10000', '100', '100', '60')
    const standard = pd('10000', '100', '100', '60')
    // Actual: same volume and price, but higher actual unit cost (less efficient)
    const actual = pd('10000', '100', '100', '70')
    const result: VarianceComponents = decomposeVariance(actual, budget, standard)
    // Efficiency effect = (standardCost - actualCost) * actualVolume = (60 - 70) * 100 = -1000
    expect(result.efficiencyEffect.toString()).toBe('-1000.0000')
    expect(result.priceEffect.isZero()).toBe(true)
    expect(result.volumeEffect.isZero()).toBe(true)
    expect(result.mixEffect.isZero()).toBe(true)
  })

  it('should satisfy reconciliation: residual is within 0.1% of total variance when all four effects are non-zero', () => {
    // Combined case: price, volume, mix, and efficiency all differ
    const budget = pd('10000', '100', '100', '60', '0.5')
    const standard = pd('10000', '100', '100', '60', '0.5')
    const actual = pd('14400', '120', '110', '70', '0.6')
    const result: VarianceComponents = decomposeVariance(actual, budget, standard)
    // Verify each effect is non-zero
    expect(result.priceEffect.isZero()).toBe(false)
    expect(result.volumeEffect.isZero()).toBe(false)
    expect(result.mixEffect.isZero()).toBe(false)
    expect(result.efficiencyEffect.isZero()).toBe(false)
    // Residual tolerance: |residual| <= 0.001 * |totalVariance|
    const totalAbs = result.totalVariance.abs()
    const residualAbs = result.residual.abs()
    if (!totalAbs.isZero()) {
      const ratio = Number(residualAbs.div(totalAbs).toString())
      expect(ratio).toBeLessThanOrEqual(0.001)
    }
  })
})
