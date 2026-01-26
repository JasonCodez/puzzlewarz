-- AlterTable
ALTER TABLE "puzzle_media" ADD COLUMN     "temporary" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "puzzleId" DROP NOT NULL;
