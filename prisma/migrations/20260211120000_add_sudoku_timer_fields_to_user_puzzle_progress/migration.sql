-- AlterTable
ALTER TABLE "user_puzzle_progress" ADD COLUMN IF NOT EXISTS "sudokuStartedAt" TIMESTAMP(3);
ALTER TABLE "user_puzzle_progress" ADD COLUMN IF NOT EXISTS "sudokuExpiresAt" TIMESTAMP(3);
ALTER TABLE "user_puzzle_progress" ADD COLUMN IF NOT EXISTS "sudokuLockedAt" TIMESTAMP(3);
ALTER TABLE "user_puzzle_progress" ADD COLUMN IF NOT EXISTS "sudokuLockReason" TEXT;
