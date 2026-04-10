-- AlterTable
ALTER TABLE "TeamEscapeProgress" ADD COLUMN     "pausedAt" TIMESTAMP(3),
ADD COLUMN     "pausedRemainingMs" INTEGER,
ADD COLUMN     "soloUserId" TEXT;
