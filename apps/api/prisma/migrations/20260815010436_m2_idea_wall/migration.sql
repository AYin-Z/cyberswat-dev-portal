-- CreateEnum
CREATE TYPE "IdeaStatus" AS ENUM ('RECRUITING', 'INCUBATING', 'PROMOTED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "idea_wall_ideas" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "need" TEXT NOT NULL,
    "techStack" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "IdeaStatus" NOT NULL DEFAULT 'RECRUITING',
    "authorId" TEXT NOT NULL,
    "promotedProjectId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_wall_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_wall_joiners" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idea_wall_joiners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idea_wall_ideas_status_createdAt_idx" ON "idea_wall_ideas"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "idea_wall_joiners_ideaId_userId_key" ON "idea_wall_joiners"("ideaId", "userId");

-- AddForeignKey
ALTER TABLE "idea_wall_ideas" ADD CONSTRAINT "idea_wall_ideas_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_wall_joiners" ADD CONSTRAINT "idea_wall_joiners_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "idea_wall_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_wall_joiners" ADD CONSTRAINT "idea_wall_joiners_userId_fkey" FOREIGN KEY ("userId") REFERENCES "core_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
