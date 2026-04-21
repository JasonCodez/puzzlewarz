-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeTitle" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "isFounder" BOOLEAN NOT NULL DEFAULT false;
