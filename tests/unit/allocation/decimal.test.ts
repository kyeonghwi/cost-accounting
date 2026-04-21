import { describe, it, expect } from 'vitest'
import { Decimal } from '@prisma/client/runtime/library'
import {
  MONEY_SCALE,
  Money,
  money,
  zero,
  add,
  sub,
  mul,
  div,
  sum,
  toMoney,
  lastStepAdjust,
} from '../../../lib/allocation/decimal'

describe('MONEY_SCALE', () => {
  it('equals 4', () => {
    expect(MONEY_SCALE).toBe(4)
  })
})

describe('Money class', () => {
  it('toString() always renders 4 decimal places', () => {
    const m = new Money('100')
    expect(m.toString()).toBe('100.0000')
  })

  it('plus() returns a Money preserving 4 decimal places', () => {
    const a = new Money('100.0000')
    const b = new Money('50.5000')
    const result = a.plus(b)
    expect(result).toBeInstanceOf(Money)
    expect(result.toString()).toBe('150.5000')
  })

  it('minus() returns a Money preserving 4 decimal places', () => {
    const a = new Money('200.0000')
    const b = new Money('75.2500')
    const result = a.minus(b)
    expect(result).toBeInstanceOf(Money)
    expect(result.toString()).toBe('124.7500')
  })

  it('minus() handles subtraction resulting in a fractional value', () => {
    const a = new Money('1000.0000')
    const b = new Money('333.3333')
    const result = a.minus(b)
    expect(result).toBeInstanceOf(Money)
    expect(result.toString()).toBe('666.6667')
  })

  it('times() returns a Money preserving 4 decimal places', () => {
    const a = new Money('100.0000')
    const b = new Money('0.3333')
    const result = a.times(b)
    expect(result).toBeInstanceOf(Money)
    expect(result.toString()).toBe('33.3300')
  })

  it('times() rounds half-up at 4 decimal places', () => {
    const a = new Money('1.0000')
    const b = new Money('0.00005')
    const result = a.times(b)
    expect(result).toBeInstanceOf(Money)
    // 0.00005 rounded to 4dp ROUND_HALF_UP = 0.0001
    expect(result.toString()).toBe('0.0001')
  })

  it('minus() with zero produces same value', () => {
    const a = new Money('500.0000')
    const result = a.minus(new Decimal('0'))
    expect(result.toString()).toBe('500.0000')
  })

  it('times() by 1 returns same value', () => {
    const a = new Money('999.9999')
    const result = a.times(new Decimal('1'))
    expect(result.toString()).toBe('999.9999')
  })
})

describe('money() factory', () => {
  it('creates a Money from a number', () => {
    const m = money(100.5)
    expect(m).toBeInstanceOf(Money)
    expect(m.toString()).toBe('100.5000')
  })

  it('creates a Money from a string', () => {
    const m = money('99.99')
    expect(m.toString()).toBe('99.9900')
  })

  it('creates a Money from a Decimal', () => {
    const d = new Decimal('1234.56789')
    const m = money(d)
    // ROUND_HALF_UP at 4dp: 1234.5679
    expect(m.toString()).toBe('1234.5679')
  })

  it('quantizes 0.00005 to 0.0001 with ROUND_HALF_UP', () => {
    const m = money('0.00005')
    expect(m.toString()).toBe('0.0001')
  })
})

describe('arithmetic helpers', () => {
  it('zero() returns a Decimal equal to 0', () => {
    expect(zero().isZero()).toBe(true)
  })

  it('add() sums two Decimals', () => {
    expect(add(new Decimal('1'), new Decimal('2')).toString()).toBe('3')
  })

  it('sub() subtracts two Decimals', () => {
    expect(sub(new Decimal('5'), new Decimal('3')).toString()).toBe('2')
  })

  it('mul() multiplies two Decimals', () => {
    expect(mul(new Decimal('4'), new Decimal('3')).toString()).toBe('12')
  })

  it('div() divides two Decimals', () => {
    expect(div(new Decimal('10'), new Decimal('4')).toString()).toBe('2.5')
  })

  it('sum() returns 0 for empty array', () => {
    expect(sum([]).isZero()).toBe(true)
  })

  it('sum() adds an array of Decimals', () => {
    const vals = [new Decimal('1'), new Decimal('2'), new Decimal('3')]
    expect(sum(vals).toString()).toBe('6')
  })
})

describe('toMoney()', () => {
  it('converts a Decimal to Money', () => {
    const m = toMoney(new Decimal('9.999'))
    expect(m).toBeInstanceOf(Money)
    expect(m.toString()).toBe('9.9990')
  })
})

describe('lastStepAdjust()', () => {
  it('returns empty array for empty allocated', () => {
    expect(lastStepAdjust(new Decimal('100'), [])).toHaveLength(0)
  })

  it('returns quantized values when residual is zero', () => {
    const pool = new Decimal('300.0000')
    const allocated = [new Decimal('100'), new Decimal('100'), new Decimal('100')]
    const result = lastStepAdjust(pool, allocated)
    expect(result).toHaveLength(3)
    for (const m of result) {
      expect(m.toString()).toBe('100.0000')
    }
  })

  it('adds residual to last element when rounding creates a gap', () => {
    // 1000 / 3 = 333.3333... repeating — last bucket gets the residual
    const pool = new Decimal('1000.0000')
    const allocated = [new Decimal('333.3333'), new Decimal('333.3333'), new Decimal('333.3333')]
    const result = lastStepAdjust(pool, allocated)
    const total = result.reduce((acc, m) => acc.plus(m), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })

  it('post-condition: sum of result always equals pool', () => {
    const pool = new Decimal('1000.0001')
    const allocated = [new Decimal('500.00005'), new Decimal('500.00005')]
    const result = lastStepAdjust(pool, allocated)
    const total = result.reduce((acc, m) => acc.plus(m), new Decimal('0'))
    expect(total.equals(pool)).toBe(true)
  })
})
