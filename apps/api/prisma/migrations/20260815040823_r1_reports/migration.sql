-- CreateTable
CREATE TABLE "core_reports" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "core_reports_status_createdAt_idx" ON "core_reports"("status", "createdAt");
