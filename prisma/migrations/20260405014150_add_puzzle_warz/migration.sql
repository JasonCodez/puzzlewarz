-- CreateEnum
CREATE TYPE "WarzChallengeStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED', 'FORFEITED');

-- CreateTable
CREATE TABLE "puzzle_warz_challenges" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengerTime" INTEGER NOT NULL,
    "challengerWager" INTEGER NOT NULL,
    "invitedUserId" TEXT,
    "opponentId" TEXT,
    "opponentTime" INTEGER,
    "status" "WarzChallengeStatus" NOT NULL DEFAULT 'OPEN',
    "winnerId" TEXT,
    "potPaid" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "puzzle_warz_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "puzzle_warz_challenges_status_idx" ON "puzzle_warz_challenges"("status");

-- CreateIndex
CREATE INDEX "puzzle_warz_challenges_challengerId_idx" ON "puzzle_warz_challenges"("challengerId");

-- CreateIndex
CREATE INDEX "puzzle_warz_challenges_opponentId_idx" ON "puzzle_warz_challenges"("opponentId");

-- CreateIndex
CREATE INDEX "puzzle_warz_challenges_puzzleId_idx" ON "puzzle_warz_challenges"("puzzleId");

-- CreateIndex
CREATE INDEX "puzzle_warz_challenges_expiresAt_idx" ON "puzzle_warz_challenges"("expiresAt");

-- AddForeignKey
ALTER TABLE "puzzle_warz_challenges" ADD CONSTRAINT "puzzle_warz_challenges_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_warz_challenges" ADD CONSTRAINT "puzzle_warz_challenges_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_warz_challenges" ADD CONSTRAINT "puzzle_warz_challenges_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_warz_challenges" ADD CONSTRAINT "puzzle_warz_challenges_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzle_warz_challenges" ADD CONSTRAINT "puzzle_warz_challenges_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
