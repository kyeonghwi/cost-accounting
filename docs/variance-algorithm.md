# Variance Algorithm — Kaplan/Atkinson 4-Way Decomposition

## Overview

The variance engine decomposes the total standard-cost variance into four additive effects
following the Kaplan/Atkinson framework. Each effect isolates one source of the gap between
actual results and the static (master) budget. The implementation lives in
`lib/variance/decompose.ts`.

---

## Definitions

| Symbol | Meaning |
|--------|---------|
| `AP`   | Actual unit price (revenue per unit) |
| `SP`   | Standard unit price (budget price) |
| `AV`   | Actual volume (units sold / hours billed) |
| `BV`   | Budgeted volume |
| `AM`   | Actual sales mix (fraction 0..1; 1.0 for single-product) |
| `BM`   | Budgeted sales mix (fraction 0..1; 1.0 for single-product) |
| `AC`   | Actual unit cost |
| `SC`   | Standard unit cost (budget cost per unit) |

---

## Formula

### Price Effect

Measures the revenue impact of charging a different price than standard for the actual volume
sold.

```
priceEffect = (AP − SP) × AV
```

Favorable when AP > SP (positive value).

### Volume Effect

Measures the revenue impact of selling a different total volume than budgeted, priced at the
standard unit price.

```
volumeEffect = (AV − BV) × SP
```

Favorable when actual volume exceeds budget (positive value).

### Mix Effect

Measures the cost/margin impact of shifting the actual product mix away from the budgeted mix.
For a single-product case both AM and BM are 1.0, so mixEffect = 0.

```
mixEffect = (AM − BM) × AV × SP
```

Favorable when the actual mix shifts toward higher-priced products.

### Efficiency Effect

Measures the cost impact of consuming more or fewer resources per unit than the standard allows
for actual output.

```
efficiencyEffect = (SC − AC) × AV
```

Favorable when actual cost per unit is lower than standard (positive value).

---

## Total Variance and Residual

The four effects sum exactly to the total variance under this linear model. The prototype
produces zero residual analytically because no cross-interaction terms (e.g., joint
price × volume) are included.

```
totalVariance = priceEffect + volumeEffect + mixEffect + efficiencyEffect
residual      = 0
```

The reconciliation constraint is:

```
|residual| / |totalVariance| ≤ 0.001   (0.1%)
```

For `totalVariance = 0`, the engine verifies `residual = 0` exactly rather than dividing.

---

## Sign Convention

All effects use the favorable-positive convention:

- Positive value → favorable (actual better than standard/budget)
- Negative value → unfavorable (actual worse than standard/budget)

---

## Worked Example

Given:

| Parameter | Budget / Standard | Actual |
|-----------|-------------------|--------|
| Volume    | 100               | 120    |
| Unit price| 100               | 110    |
| Unit cost | 60                | 70     |
| Mix       | 0.50              | 0.60   |

Calculations:

```
priceEffect      = (110 − 100) × 120 = 1200
volumeEffect     = (120 − 100) × 100 = 2000
mixEffect        = (0.60 − 0.50) × 120 × 100 = 1200
efficiencyEffect = (60 − 70) × 120 = −1200

totalVariance = 1200 + 2000 + 1200 + (−1200) = 3200
residual      = 0
```

Residual check: 0 / |3200| = 0 ≤ 0.001 ✓

---

## Output Shape

```ts
interface VarianceComponents {
  priceEffect:      Decimal  // Money — toString() returns 4 decimal places
  volumeEffect:     Decimal  // Money
  mixEffect:        Decimal  // Money
  efficiencyEffect: Decimal  // Money
  totalVariance:    Decimal  // Money
  residual:         Decimal  // Money — zero under the linear model
}
```

All Decimal values are `Money` instances (`lib/allocation/decimal.ts`) serialized with
`MONEY_SCALE = 4` decimal places.

---

## References

- Kaplan, R. S. & Atkinson, A. A. — *Advanced Management Accounting*, Chapter 7
- Horngren, C. T., Datar, S. M., & Rajan, M. V. — *Cost Accounting: A Managerial Emphasis*,
  Chapters 7–8
