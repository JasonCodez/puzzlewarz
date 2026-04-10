-- AlterTable
ALTER TABLE "witness_results" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "witness_results_userId_scenarioId_idx" ON "witness_results"("userId", "scenarioId");
