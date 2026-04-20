-- AlterTable
ALTER TABLE "users" ADD COLUMN     "prelaunchAnonId" TEXT,
ADD COLUMN     "prelaunchRewardPoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prelaunchRewardXp" INTEGER NOT NULL DEFAULT 0;
