import { PrismaClient, OrgKind, CostCategoryKind, RateScope, PeriodStatus } from '@prisma/client'

// Seed a minimal dataset: 1 Enterprise, 1 HQ, 2 Departments,
// 3 Projects, 2 CostCategories, 10 Personnel, 1 Period, ~25 CostEntries.
// All upserts are idempotent using stable CUID-style IDs.

const IDS = {
  enterprise: 'org-ent-001',
  hq: 'org-hq-001',
  dept1: 'org-dept-001',
  dept2: 'org-dept-002',
  proj1: 'proj-001',
  proj2: 'proj-002',
  proj3: 'proj-003',
  catLabor: 'cat-labor-001',
  catOverhead: 'cat-overhead-001',
  period: 'period-2024-04',
}

const RATE_EFFECTIVE = new Date('2024-01-01T00:00:00.000Z')

// @AX:NOTE [AUTO] all upserts keyed on id (cuid) so re-running seed is safe
export async function seedSmall(prisma: PrismaClient): Promise<void> {
  // Organizations
  await prisma.organization.upsert({
    where: { id: IDS.enterprise },
    update: {},
    create: { id: IDS.enterprise, name: 'Acme Corp', kind: OrgKind.ENTERPRISE },
  })
  await prisma.organization.upsert({
    where: { id: IDS.hq },
    update: {},
    create: { id: IDS.hq, name: 'HQ Alpha', kind: OrgKind.HQ, parentId: IDS.enterprise },
  })
  await prisma.organization.upsert({
    where: { id: IDS.dept1 },
    update: {},
    create: { id: IDS.dept1, name: 'Engineering', kind: OrgKind.DEPARTMENT, parentId: IDS.hq },
  })
  await prisma.organization.upsert({
    where: { id: IDS.dept2 },
    update: {},
    create: { id: IDS.dept2, name: 'Operations', kind: OrgKind.DEPARTMENT, parentId: IDS.hq },
  })

  // CostCategories
  await prisma.costCategory.upsert({
    where: { id: IDS.catLabor },
    update: {},
    create: { id: IDS.catLabor, code: 'LABOR', kind: CostCategoryKind.LABOR },
  })
  await prisma.costCategory.upsert({
    where: { id: IDS.catOverhead },
    update: {},
    create: { id: IDS.catOverhead, code: 'OVERHEAD', kind: CostCategoryKind.OVERHEAD },
  })

  // Projects
  const projects = [
    { id: IDS.proj1, code: 'PROJ-001', name: 'Alpha Platform', budget: '500000.0000' },
    { id: IDS.proj2, code: 'PROJ-002', name: 'Beta Analytics', budget: '300000.0000' },
    { id: IDS.proj3, code: 'PROJ-003', name: 'Gamma Infrastructure', budget: '200000.0000' },
  ]
  for (const p of projects) {
    await prisma.project.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, code: p.code, name: p.name, ownerHqId: IDS.hq, budgetAmount: p.budget },
    })
  }

  // Personnel (8 LABOR + 2 OVERHEAD)
  const personnelData = [
    { id: 'pers-001', name: 'Alice Kim', catId: IDS.catLabor },
    { id: 'pers-002', name: 'Bob Park', catId: IDS.catLabor },
    { id: 'pers-003', name: 'Carol Lee', catId: IDS.catLabor },
    { id: 'pers-004', name: 'David Choi', catId: IDS.catLabor },
    { id: 'pers-005', name: 'Eve Jung', catId: IDS.catLabor },
    { id: 'pers-006', name: 'Frank Oh', catId: IDS.catLabor },
    { id: 'pers-007', name: 'Grace Han', catId: IDS.catLabor },
    { id: 'pers-008', name: 'Henry Yoon', catId: IDS.catLabor },
    { id: 'pers-009', name: 'Iris Shin', catId: IDS.catOverhead },
    { id: 'pers-010', name: 'James Kwon', catId: IDS.catOverhead },
  ]
  for (const p of personnelData) {
    await prisma.personnel.upsert({
      where: { id: p.id },
      update: {},
      create: { id: p.id, name: p.name, homeHqId: IDS.hq, costCategoryId: p.catId },
    })
  }

  // StandardRates per person (effectiveFrom 2024-01-01)
  const hourlyRates: Record<string, string> = {
    'pers-001': '120.0000', 'pers-002': '115.0000', 'pers-003': '110.0000',
    'pers-004': '105.0000', 'pers-005': '100.0000', 'pers-006': '95.0000',
    'pers-007': '90.0000',  'pers-008': '85.0000',  'pers-009': '80.0000',
    'pers-010': '75.0000',
  }
  for (const [pid, rate] of Object.entries(hourlyRates)) {
    const rateId = `rate-${pid}`
    await prisma.standardRate.upsert({
      where: { id: rateId },
      update: {},
      create: {
        id: rateId,
        scope: RateScope.PERSONNEL,
        targetId: pid,
        amount: rate,
        effectiveFrom: RATE_EFFECTIVE,
      },
    })
  }

  // Period: April 2024 (OPEN)
  await prisma.period.upsert({
    where: { id: IDS.period },
    update: {},
    create: { id: IDS.period, yearMonth: '2024-04', status: PeriodStatus.OPEN },
  })

  // CostEntries (~25 rows across 10 personnel and 3 projects)
  const projectIds = [IDS.proj1, IDS.proj2, IDS.proj3]
  let entrySeq = 0
  for (const p of personnelData) {
    const projId = projectIds[entrySeq % 3]
    const hours = '8.0000'
    const rate = parseFloat(hourlyRates[p.id])
    const amount = (rate * 8).toFixed(4)
    for (let day = 1; day <= 3; day++) {
      entrySeq++
      const entryId = `entry-small-${entrySeq}`
      await prisma.costEntry.upsert({
        where: { id: entryId },
        update: {},
        create: {
          id: entryId,
          personnelId: p.id,
          projectId: projId,
          periodId: IDS.period,
          date: new Date(`2024-04-${String(day).padStart(2, '0')}T09:00:00.000Z`),
          hours,
          amount,
        },
      })
    }
  }

  console.log('Small seed complete.')
}
