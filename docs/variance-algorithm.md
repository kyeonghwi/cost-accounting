# Variance Factor Analysis Algorithm

## Overview

The variance engine decomposes the total standard-cost variance into four additive effects
following the Kaplan/Atkinson framework. Each effect isolates one source of the gap between
actual results and the static (master) budget.

**Source file**: `lib/engines/variance.ts`

---

## Kaplan/Atkinson Decomposition

Given these inputs per cost element:

| Symbol | Meaning |
|--------|---------|
| `AP`   | Actual price per unit of input |
| `SP`   | Standard price per unit of input |
| `AQ`   | Actual quantity of input used |
| `SQ`   | Standard quantity of input allowed for actual output |
| `AV`   | Actual volume (units produced/sold) |
| `BV`   | Budgeted volume (units) |
| `AM`   | Actual sales mix percentage |
| `BM`   | Budgeted sales mix percentage |

### Price Effect

Measures the cost of paying a different price than standard for the actual quantity consumed.

```
priceEffect = (AP - SP) × AQ
```

TODO — specify sign convention (favorable = negative cost variance) during T5 implementation.

### Volume Effect

Measures the absorption difference driven purely by a change in total units versus budget.

```
volumeEffect = SP × SQ_perUnit × (AV - BV)
```

TODO — clarify interaction with fixed vs. variable overhead split during T5 implementation.

### Mix Effect

Measures the cost impact of shifting the actual product/input mix away from the budgeted mix.

```
mixEffect = SP × AV × (AM - BM)
```

TODO — applicable to multi-product contribution margin analysis; single-product case = 0.

### Efficiency Effect

Measures the cost of consuming more or fewer inputs than the standard allows for actual output.

```
efficiencyEffect = SP × (AQ - SQ)
```

TODO — fill in interaction with labor efficiency and material usage sub-variances during T5.

---

## Reconciliation Test

The four effects must reconcile to the total variance within a defined tolerance.

```
totalVariance   = (AP × AQ) - (SP × SQ)

computedSum     = priceEffect + volumeEffect + mixEffect + efficiencyEffect

reconciliationError = |totalVariance - computedSum|
toleranceLimit      = 0.001 × |totalVariance|   // 0.1%
```

If `reconciliationError > toleranceLimit`, the engine throws a `ReconciliationError`
rather than returning a silently inconsistent result.

For `totalVariance = 0`, the engine skips the percentage check and verifies
`computedSum = 0` exactly (within floating-point epsilon of 1e-9).

---

## Output Shape

TODO — define `VarianceResult` type in `lib/engines/variance.ts` during T5:

```ts
// Placeholder — fill in during T5
interface VarianceResult {
  priceEffect: number
  volumeEffect: number
  mixEffect: number
  efficiencyEffect: number
  totalVariance: number
  reconciled: boolean
}
```

---

## References

- Kaplan, R. S. & Atkinson, A. A. — *Advanced Management Accounting*, Chapter 7
- Horngren, C. T., Datar, S. M., & Rajan, M. V. — *Cost Accounting: A Managerial Emphasis*, Chapter 7–8
