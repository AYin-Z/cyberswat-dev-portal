-- CreateTable
CREATE TABLE "core_agents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "userId" TEXT,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_agents_name_key" ON "core_agents"("name");

-- CreateIndex
CREATE UNIQUE INDEX "core_agents_identity_key" ON "core_agents"("identity");
