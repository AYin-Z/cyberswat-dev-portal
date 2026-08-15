-- CreateIndex
CREATE INDEX "announcement_announcements_authorId_idx" ON "announcement_announcements"("authorId");

-- CreateIndex
CREATE INDEX "community_comments_authorId_idx" ON "community_comments"("authorId");

-- CreateIndex
CREATE INDEX "community_posts_authorId_idx" ON "community_posts"("authorId");

-- CreateIndex
CREATE INDEX "project_projects_leadId_idx" ON "project_projects"("leadId");

-- CreateIndex
CREATE INDEX "project_tasks_creatorId_idx" ON "project_tasks"("creatorId");
