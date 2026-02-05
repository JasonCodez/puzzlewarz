-- AlterTable
ALTER TABLE "user_escape_progress" ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failedReason" TEXT;
