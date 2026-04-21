# Allocation Algorithm

## Overview

The allocation engine distributes indirect cost pool balances to cost objects (jobs, products,
departments) using a driver-based approach. Two methods are supported: direct allocation and
step-down (sequential) allocation.

**Source file**: `lib/engines/allocation.ts`

---

## Direct Allocation

Direct allocation assigns each service department's costs directly to production departments,
ignoring services rendered between service departments.

### Allocation Keys

| Key | Description | Driver Basis |
|-----|-------------|--------------|
| `HEADCOUNT` | Number of employees in the receiving department | Head count at period start |
| `DIRECT_LABOR_HOURS` | Direct labor hours worked in the receiving department | Actual DLH for period |
| `DIRECT_COST` | Direct material + direct labor cost in the receiving department | Actual period cost |

Custom numeric drivers are also supported via the `customKey` field on a pool.

### Allocation Formula

For a pool with balance `B` and a set of receiving cost objects:

```
driverTotal  = Σ driver[i]   for all receiving objects i
rate[i]      = driver[i] / driverTotal
allocated[i] = B × rate[i]
```

TODO — fill in rounding details and tie-in to `AllocationResult` type during T4 implementation.

### Example

Pool: IT Overhead, Balance = $120,000, Key = HEADCOUNT

| Department | Headcount | Share | Allocated |
|------------|-----------|-------|-----------|
| Machining  | 40        | 40%   | $48,000   |
| Assembly   | 60        | 60%   | $72,000   |

---

## Step-Down Allocation

Step-down (sequential) allocation recognizes partial inter-service-department relationships.
Departments are ranked by a priority score (e.g., total costs or management judgment).
Each department allocates its full balance once and does not receive further allocations.

### Ranking

TODO — specify ranking heuristic (highest total cost first vs. explicit sequence) during T4.

### Formula

Step-down applies the same rate formula as direct allocation, but the receiving set excludes
departments that have already been closed in earlier steps.

```
For step k (department D_k allocating):
  receivingSet = { all cost objects } \ { D_1, ..., D_{k-1} }
  rate[i]      = driver[i] / Σ driver[j] (j in receivingSet)
  allocated[i] = balance(D_k) × rate[i]
```

TODO — fill in interaction with reciprocal method comparison during T4 implementation.

---

## Rounding Adjustment

Floating-point arithmetic can produce a residual when rates do not divide evenly.
The engine applies a last-step residual adjustment:

```
residual = B - Σ allocated[i]   (for all but the last receiving object)
allocated[last] += residual
```

This guarantees that `Σ allocated[i] = B` exactly, regardless of floating-point errors.

The adjustment is bounded: if `|residual| > 0.005 × B`, the engine raises an error rather
than silently absorbing a large discrepancy.

---

## References

- Horngren, C. T., Datar, S. M., & Rajan, M. V. — *Cost Accounting: A Managerial Emphasis*, Chapter 15
- Kaplan, R. S. & Atkinson, A. A. — *Advanced Management Accounting*, Chapter 4
