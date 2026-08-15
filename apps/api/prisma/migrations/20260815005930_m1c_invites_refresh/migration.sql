-- CreateTable
CREATE TABLE "core_invites" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "role" "CoreRole" NOT NULL DEFAULT 'MEMBER',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_refresh_tokens" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "replacedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_invites_tokenHash_key" ON "core_invites"("tokenHash");

-- CreateIndex
CREATE INDEX "core_invites_createdAt_idx" ON "core_invites"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "core_refresh_tokens_tokenHash_key" ON "core_refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "core_refresh_tokens_userId_idx" ON "core_refresh_tokens"("userId");
