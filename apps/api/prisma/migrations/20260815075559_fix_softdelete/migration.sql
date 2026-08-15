-- AlterTable
ALTER TABLE "community_comments" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "deletedAt" TIMESTAMP(3);
