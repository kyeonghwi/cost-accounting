import {
  PrismaClient,
  OrgKind,
  CostCategoryKind,
  RateScope,
  PeriodStatus,
  AllocationKey,
  AllocationMethod,
  TransferDirection,
} from '@prisma/client'

// Full seed: 1 Enterprise, 5 HQs, 10 Departments, 20 Projects,
// 4 CostCategories, ~200 Personnel, 12 Periods, ~2000 CostEntries,
// TransferMarkup, AllocationRule entries.
// All upserts are idempotent.

const RATE_EFFECTIVE = new Date('2024-01-01T00:00:00.000Z')

function pad(n: number, width = 3): string {
  return String(n).padStart(width, '0')
}

export async function seedFull(prisma: PrismaClient): Promise<void> {
  // Enterprise
  const enterpriseId = 'full-org-ent-001'
  await prisma.organization.upsert({
    where: { id: enterpriseId },
    update: {},
    create: { id: enterpriseId, name: 'GlobalCorp Enterprise', kind: OrgKind.ENTERPRISE },
  })

  // 5 HQs with 2 Departments each
  const hqIds: string[] = []
  for (let h = 1; h <= 5; h++) {
    const hqId = `full-hq-${pad(h)}`
    hqIds.push(hqId)
    await prisma.organization.upsert({
      where: { id: hqId },
      update: {},
      create: { id: hqId, name: `HQ ${h}`, kind: OrgKind.HQ, parentId: enterpriseId },
    })
    for (let d = 1; d <= 2; d++) {
      const deptId = `full-dept-${pad(h)}-${d}`
      await prisma.organization.upsert({
        where: { id: deptId },
        update: {},
        create: { id: deptId, name: `Dept ${h}-${d}`, kind: OrgKind.DEPARTMENT, parentId: hqId },
      })
    }
  }

  // 4 CostCategories
  const categories = [
    { id: 'full-cat-labor', code: 'FULL_LABOR', kind: CostCategoryKind.LABOR },
    { id: 'full-cat-overhead-1', code: 'FULL_OVERHEAD_A', kind: CostCategoryKind.OVERHEAD },
    { id: 'full-cat-overhead-2', code: 'FULL_OVERHEAD_B', kind: CostCategoryKind.OVERHEAD },
    { id: 'full-cat-external', code: 'FULL_EXTERNAL', kind: CostCategoryKind.EXTERNAL },
  ]
  for (const cat of categories) {
    await prisma.costCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: cat,
    })
  }

  // 20 Projects: 4 per HQ
  const projectIds: string[] = []
  let projSeq = 0
  for (let h = 0; h < 5; h++) {
    for (let p = 1; p <= 4; p++) {
      projSeq++
      const projId = `full-proj-${pad(projSeq)}`
      projectIds.push(projId)
      await prisma.project.upsert({
        where: { id: projId },
        update: {},
        create: {
          id: projId,
          code: `FULL-P${pad(projSeq)}`,
          name: `Project ${projSeq}`,
          ownerHqId: hqIds[h],
          budgetAmount: `${(100000 + projSeq * 25000).toFixed(4)}`,
        },
      })
    }
  }

  // ~200 Personnel: 40 per HQ (30 LABOR + 8 OVERHEAD-A + 2 EXTERNAL per HQ)
  const personnelIds: string[] = []
  const personnelRates: Record<string, string> = {}
  let persSeq = 0

  const catDist = [
    { catId: 'full-cat-labor', count: 30, baseRate: 100 },
    { catId: 'full-cat-overhead-1', count: 7, baseRate: 80 },
    { catId: 'full-cat-overhead-2', count: 1, baseRate: 70 },
    { catId: 'full-cat-external', count: 2, baseRate: 60 },
  ]

  for (let h = 0; h < 5; h++) {
    for (const { catId, count, baseRate } of catDist) {
      for (let i = 0; i < count; i++) {
        persSeq++
        const pid = `full-pers-${pad(persSeq)}`
        personnelIds.push(pid)
        const rate = (baseRate + (persSeq % 30)).toFixed(4)
        personnelRates[pid] = rate
        await prisma.personnel.upsert({
          where: { id: pid },
          update: {},
          create: { id: pid, name: `Person ${persSeq}`, homeHqId: hqIds[h], costCategoryId: catId },
        })
        await prisma.standardRate.upsert({
          where: { id: `full-rate-${pid}` },
          update: {},
          create: {
            id: `full-rate-${pid}`,
            scope: RateScope.PERSONNEL,
            targetId: pid,
            amount: rate,
            effectiveFrom: RATE_EFFECTIVE,
          },
        })
      }
    }
  }

  // TransferMarkup: 5 HQ pairs
  const markupPairs = [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 0],
  ]
  for (const [fi, ti] of markupPairs) {
    const mkId = `full-mk-${fi}-${ti}`
    await prisma.transferMarkup.upsert({
      where: { id: mkId },
      update: {},
      create: {
        id: mkId,
        fromHqId: hqIds[fi],
        toHqId: hqIds[ti],
        markupPct: '10.0000',
        effectiveFrom: RATE_EFFECTIVE,
      },
    })
  }

  // AllocationRule: 1 per HQ
  for (let h = 0; h < 5; h++) {
    const ruleId = `full-rule-${pad(h + 1)}`
    await prisma.allocationRule.upsert({
      where: { id: ruleId },
      update: {},
      create: {
        id: ruleId,
        poolOrgId: hqIds[h],
        allocationKey: AllocationKey.DIRECT_LABOR_HOURS,
        method: AllocationMethod.STEP_DOWN,
        sequence: h + 1,
      },
    })
  }

  // 12 Periods (2024-01 to 2024-12)
  const periodIds: string[] = []
  for (let m = 1; m <= 12; m++) {
    const ym = `2024-${String(m).padStart(2, '0')}`
    const periodId = `full-period-${ym}`
    periodIds.push(periodId)
    const status = m < 12 ? PeriodStatus.CLOSED : PeriodStatus.OPEN
    const closedAt = m < 12 ? new Date(`2024-${String(m).padStart(2, '0')}-28T23:59:59.000Z`) : null
    await prisma.period.upsert({
      where: { id: periodId },
      update: {},
      create: { id: periodId, yearMonth: ym, status, closedAt: closedAt ?? undefined },
    })
  }

  // CostEntries: ~2000 rows
  // Each personnel gets 1 entry per period, assigned to a rotating project
  let entrySeq = 0
  const BATCH_SIZE = 100
  const entries: Parameters<typeof prisma.costEntry.upsert>[0][] = []

  for (let pi = 0; pi < personnelIds.length; pi++) {
    const pid = personnelIds[pi]
    const rate = parseFloat(personnelRates[pid])
    // Each person gets entries for 10 of 12 months to keep count under 2200
    for (let mi = 0; mi < 10; mi++) {
      entrySeq++
      const projId = projectIds[entrySeq % 20]
      const hours = 160
      const amount = (rate * hours).toFixed(4)
      const entryId = `full-entry-${pad(entrySeq, 5)}`
      const periodId = periodIds[mi]
      const month = mi + 1
      await prisma.costEntry.upsert({
        where: { id: entryId },
        update: {},
        create: {
          id: entryId,
          personnelId: pid,
          projectId: projId,
          periodId,
          date: new Date(`2024-${String(month).padStart(2, '0')}-15T09:00:00.000Z`),
          hours: hours.toFixed(4),
          amount,
        },
      })
      // Log progress every 500 entries
      if (entrySeq % 500 === 0) {
        console.log(`  CostEntry progress: ${entrySeq}`)
      }
    }
  }

  // Sample TransferEntry for first HQ pair, first period
  await prisma.transferEntry.upsert({
    where: { id: 'full-te-001' },
    update: {},
    create: {
      id: 'full-te-001',
      periodId: periodIds[0],
      fromHqId: hqIds[0],
      toHqId: hqIds[1],
      personnelId: personnelIds[0],
      hours: '160.0000',
      standardRate: personnelRates[personnelIds[0]],
      markupPct: '10.0000',
      amount: (parseFloat(personnelRates[personnelIds[0]]) * 160 * 1.1).toFixed(4),
      direction: TransferDirection.CREDIT,
    },
  })

  // Sample AllocationRun and Results for first period
  await prisma.allocationRun.upsert({
    where: { id: 'full-run-001' },
    update: {},
    create: {
      id: 'full-run-001',
      periodId: periodIds[0],
      method: AllocationMethod.STEP_DOWN,
      inputChecksum: 'sha256-input-placeholder',
      outputChecksum: 'sha256-output-placeholder',
      runtimeMs: 120,
    },
  })
  for (let p = 0; p < 5; p++) {
    await prisma.allocationResult.upsert({
      where: { id: `full-res-${p + 1}` },
      update: {},
      create: {
        id: `full-res-${p + 1}`,
        runId: 'full-run-001',
        fromPoolOrgId: hqIds[p],
        toProjectId: projectIds[p * 4],
        amount: `${(50000 + p * 5000).toFixed(4)}`,
      },
    })
  }

  console.log(`Full seed complete. Total personnel: ${persSeq}, entries: ${entrySeq}`)
}
