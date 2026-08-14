-- CreateEnum
CREATE TYPE "CoreRole" AS ENUM ('GUEST', 'MEMBER', 'DEPT_LEADER', 'ADMIN');

-- CreateTable
CREATE TABLE "core_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "realName" TEXT,
    "teamInfo" TEXT,
    "grade" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bio" TEXT,
    "avatarUrl" TEXT,
    "github" TEXT,
    "links" JSONB NOT NULL DEFAULT '[]',
    "role" "CoreRole" NOT NULL DEFAULT 'MEMBER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "githubId" TEXT,
    "githubToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "core_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_role_permissions" (
    "id" TEXT NOT NULL,
    "role" "CoreRole" NOT NULL,
    "permission" TEXT NOT NULL,
    "grantedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_tool_calls" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "caller" TEXT NOT NULL,
    "agentId" TEXT,
    "params" JSONB NOT NULL,
    "result" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_tool_calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_plugins" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_plugins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "announcement_announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_reads" (
    "id" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_users_email_key" ON "core_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "core_users_githubId_key" ON "core_users"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "core_role_permissions_role_permission_key" ON "core_role_permissions"("role", "permission");

-- CreateIndex
CREATE INDEX "core_tool_calls_toolId_createdAt_idx" ON "core_tool_calls"("toolId", "createdAt");

-- CreateIndex
CREATE INDEX "announcement_announcements_publishedAt_idx" ON "announcement_announcements"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "announcement_reads_announcementId_userId_key" ON "announcement_reads"("announcementId", "userId");

-- AddForeignKey
ALTER TABLE "announcement_announcements" ADD CONSTRAINT "announcement_announcements_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_announcementId_fkey" FOREIGN KEY ("announcementId") REFERENCES "announcement_announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_reads" ADD CONSTRAINT "announcement_reads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
