-- CreateEnum
CREATE TYPE "OrgKind" AS ENUM ('ENTERPRISE', 'HQ', 'DEPARTMENT');

-- CreateEnum
CREATE TYPE "CostCategoryKind" AS ENUM ('LABOR', 'OVERHEAD', 'EXTERNAL');

-- CreateEnum
CREATE TYPE "RateScope" AS ENUM ('PERSONNEL', 'CATEGORY');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AllocationKey" AS ENUM ('HEADCOUNT', 'DIRECT_LABOR_HOURS', 'DIRECT_COST');

-- CreateEnum
CREATE TYPE "AllocationMethod" AS ENUM ('DIRECT', 'STEP_DOWN');

-- CreateEnum
CREATE TYPE "TransferDirection" AS ENUM ('CREDIT', 'CHARGE');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "OrgKind" NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerHqId" TEXT NOT NULL,
    "budgetAmount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Personnel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homeHqId" TEXT NOT NULL,
    "costCategoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Personnel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CostCategoryKind" NOT NULL,
    CONSTRAINT "CostCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StandardRate" (
    "id" TEXT NOT NULL,
    "scope" "RateScope" NOT NULL,
    "targetId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StandardRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferMarkup" (
    "id" TEXT NOT NULL,
    "fromHqId" TEXT NOT NULL,
    "toHqId" TEXT NOT NULL,
    "markupPct" DECIMAL(18,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    CONSTRAINT "TransferMarkup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "yearMonth" TEXT NOT NULL,
    "status" "PeriodStatus" NOT NULL,
    "closedAt" TIMESTAMP(3),
    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostEntry" (
    "id" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hours" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CostEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRule" (
    "id" TEXT NOT NULL,
    "poolOrgId" TEXT NOT NULL,
    "allocationKey" "AllocationKey" NOT NULL,
    "method" "AllocationMethod" NOT NULL,
    "sequence" INTEGER,
    CONSTRAINT "AllocationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationRun" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "method" "AllocationMethod" NOT NULL,
    "inputChecksum" TEXT NOT NULL,
    "outputChecksum" TEXT NOT NULL,
    "runtimeMs" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AllocationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllocationResult" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "fromPoolOrgId" TEXT NOT NULL,
    "toProjectId" TEXT NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    CONSTRAINT "AllocationResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransferEntry" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "fromHqId" TEXT NOT NULL,
    "toHqId" TEXT NOT NULL,
    "personnelId" TEXT NOT NULL,
    "hours" DECIMAL(18,4) NOT NULL,
    "standardRate" DECIMAL(18,4) NOT NULL,
    "markupPct" DECIMAL(18,4) NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "direction" "TransferDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransferEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VarianceSnapshot" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "priceEffect" DECIMAL(18,4) NOT NULL,
    "volumeEffect" DECIMAL(18,4) NOT NULL,
    "mixEffect" DECIMAL(18,4) NOT NULL,
    "efficiencyEffect" DECIMAL(18,4) NOT NULL,
    "residual" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "VarianceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "actorPersona" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateUnique
CREATE UNIQUE INDEX "Project_code_key" ON "Project"("code");
CREATE UNIQUE INDEX "CostCategory_code_key" ON "CostCategory"("code");
CREATE UNIQUE INDEX "TransferMarkup_fromHqId_toHqId_effectiveFrom_key" ON "TransferMarkup"("fromHqId", "toHqId", "effectiveFrom");
CREATE UNIQUE INDEX "Period_yearMonth_key" ON "Period"("yearMonth");

-- CreateIndex
CREATE INDEX "CostEntry_personnelId_projectId_periodId_idx" ON "CostEntry"("personnelId", "projectId", "periodId");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerHqId_fkey"
    FOREIGN KEY ("ownerHqId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_homeHqId_fkey"
    FOREIGN KEY ("homeHqId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Personnel" ADD CONSTRAINT "Personnel_costCategoryId_fkey"
    FOREIGN KEY ("costCategoryId") REFERENCES "CostCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransferMarkup" ADD CONSTRAINT "TransferMarkup_fromHqId_fkey"
    FOREIGN KEY ("fromHqId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransferMarkup" ADD CONSTRAINT "TransferMarkup_toHqId_fkey"
    FOREIGN KEY ("toHqId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_personnelId_fkey"
    FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_projectId_fkey"
    FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CostEntry" ADD CONSTRAINT "CostEntry_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AllocationRule" ADD CONSTRAINT "AllocationRule_poolOrgId_fkey"
    FOREIGN KEY ("poolOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AllocationRun" ADD CONSTRAINT "AllocationRun_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AllocationResult" ADD CONSTRAINT "AllocationResult_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "AllocationRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AllocationResult" ADD CONSTRAINT "AllocationResult_toProjectId_fkey"
    FOREIGN KEY ("toProjectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransferEntry" ADD CONSTRAINT "TransferEntry_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransferEntry" ADD CONSTRAINT "TransferEntry_fromHqId_fkey"
    FOREIGN KEY ("fromHqId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransferEntry" ADD CONSTRAINT "TransferEntry_toHqId_fkey"
    FOREIGN KEY ("toHqId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TransferEntry" ADD CONSTRAINT "TransferEntry_personnelId_fkey"
    FOREIGN KEY ("personnelId") REFERENCES "Personnel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "VarianceSnapshot" ADD CONSTRAINT "VarianceSnapshot_periodId_fkey"
    FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
