-- AlterTable
ALTER TABLE "community_comments" ADD COLUMN     "authorViaAgent" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "community_posts" ADD COLUMN     "authorViaAgent" BOOLEAN NOT NULL DEFAULT false;
