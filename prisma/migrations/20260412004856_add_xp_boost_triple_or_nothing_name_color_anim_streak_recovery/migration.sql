-- AlterTable
ALTER TABLE "user_streaks" ADD COLUMN     "lastStreakBeforeBreak" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeCompletionAnimation" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "activeNameColor" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "tripleOrNothingActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tripleOrNothingTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "xpBoostExpiresAt" TIMESTAMP(3);
