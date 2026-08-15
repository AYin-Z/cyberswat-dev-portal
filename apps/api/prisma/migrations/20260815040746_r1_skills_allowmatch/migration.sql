-- AlterTable
ALTER TABLE "core_users" ADD COLUMN     "allowMatch" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "core_skill_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_skill_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core_skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "core_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "core_skill_categories_name_key" ON "core_skill_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "core_skills_name_key" ON "core_skills"("name");

-- CreateIndex
CREATE INDEX "core_skills_categoryId_idx" ON "core_skills"("categoryId");

-- AddForeignKey
ALTER TABLE "core_skills" ADD CONSTRAINT "core_skills_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "core_skill_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
