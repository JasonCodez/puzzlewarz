-- AlterTable
ALTER TABLE "gridlock_solves" ADD COLUMN     "anonId" TEXT;

-- CreateIndex
CREATE INDEX "gridlock_solves_anonId_idx" ON "gridlock_solves"("anonId");
