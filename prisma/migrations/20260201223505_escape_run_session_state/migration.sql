/*
  Warnings:

  - You are about to drop the `tool_usages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tools` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `user_tools` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "tool_usages" DROP CONSTRAINT "tool_usages_toolId_fkey";

-- DropForeignKey
ALTER TABLE "tool_usages" DROP CONSTRAINT "tool_usages_userId_fkey";

-- DropForeignKey
ALTER TABLE "user_tools" DROP CONSTRAINT "user_tools_toolId_fkey";

-- DropForeignKey
ALTER TABLE "user_tools" DROP CONSTRAINT "user_tools_userId_fkey";

-- AlterTable
ALTER TABLE "TeamEscapeProgress" ADD COLUMN     "briefingAcks" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "failedAt" TIMESTAMP(3),
ADD COLUMN     "failedReason" TEXT,
ADD COLUMN     "inventoryLocks" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "roles" TEXT NOT NULL DEFAULT '{}',
ADD COLUMN     "runExpiresAt" TIMESTAMP(3),
ADD COLUMN     "runStartedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "tool_usages";

-- DropTable
DROP TABLE "tools";

-- DropTable
DROP TABLE "user_tools";
