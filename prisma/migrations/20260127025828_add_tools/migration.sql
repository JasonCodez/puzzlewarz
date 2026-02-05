-- Restored migration (was applied to DB but missing locally)

-- CreateIndex
CREATE INDEX "tool_usages_puzzleId_idx" ON "tool_usages"("puzzleId");

-- CreateIndex
CREATE INDEX "tool_usages_teamId_idx" ON "tool_usages"("teamId");

-- CreateIndex
CREATE INDEX "user_tools_toolId_idx" ON "user_tools"("toolId");

-- CreateIndex
CREATE INDEX "user_tools_userId_idx" ON "user_tools"("userId");

-- AddForeignKey
ALTER TABLE "tool_usages" ADD CONSTRAINT "tool_usages_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tool_usages" ADD CONSTRAINT "tool_usages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tools" ADD CONSTRAINT "user_tools_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "tools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tools" ADD CONSTRAINT "user_tools_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
