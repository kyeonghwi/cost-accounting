import { Decimal } from '@prisma/client/runtime/library'
import { assertReconciles, residualRatio } from '../../../lib/variance/reconcile'
import type { VarianceComponents } from '../../../lib/variance/decompose'

function makeComponents(overrides: Partial<VarianceComponents>): VarianceComponents {
  const defaults: VarianceComponents = {
    priceEffect: new Decimal(0),
    volumeEffect: new Decimal(0),
    mixEffect: new Decimal(0),
    efficiencyEffect: new Decimal(0),
    residual: new Decimal(0),
    totalVariance: new Decimal(0),
  }
  return { ...defaults, ...overrides }
}

describe('residualRatio', () => {
  it('should return 0 when totalVariance is zero', () => {
    const c = makeComponents({ totalVariance: new Decimal(0), residual: new Decimal(0) })
    expect(residualRatio(c).toNumber()).toBe(0)
  })

  it('should compute |residual| / |totalVariance|', () => {
    const c = makeComponents({ totalVariance: new Decimal(1000), residual: new Decimal(1) })
    expect(residualRatio(c).toFixed(4)).toBe('0.0010')
  })

  it('should use absolute values (negative totalVariance)', () => {
    const c = makeComponents({ totalVariance: new Decimal(-1000), residual: new Decimal(-2) })
    expect(residualRatio(c).toFixed(4)).toBe('0.0020')
  })
})

describe('assertReconciles', () => {
  it('should pass when residual is zero and totalVariance is zero', () => {
    const c = makeComponents({ totalVariance: new Decimal(0), residual: new Decimal(0) })
    expect(() => assertReconciles(c)).not.toThrow()
  })

  it('should throw when totalVariance is zero but residual is non-zero', () => {
    const c = makeComponents({ totalVariance: new Decimal(0), residual: new Decimal(0.5) })
    expect(() => assertReconciles(c)).toThrow(RangeError)
  })

  it('should pass when residual ratio is exactly 0.001', () => {
    const c = makeComponents({ totalVariance: new Decimal(1000), residual: new Decimal(1) })
    expect(() => assertReconciles(c)).not.toThrow()
  })

  it('should pass when residual ratio is below 0.001', () => {
    const c = makeComponents({ totalVariance: new Decimal(10000), residual: new Decimal(5) })
    expect(() => assertReconciles(c)).not.toThrow()
  })

  it('should throw when residual ratio exceeds 0.001', () => {
    const c = makeComponents({ totalVariance: new Decimal(1000), residual: new Decimal(2) })
    expect(() => assertReconciles(c)).toThrow(RangeError)
  })
})
