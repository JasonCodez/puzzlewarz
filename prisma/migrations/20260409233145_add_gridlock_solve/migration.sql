-- CreateTable
CREATE TABLE "gridlock_solves" (
    "id" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT,
    "rank" TEXT NOT NULL,
    "elapsedSeconds" INTEGER NOT NULL,
    "submissionCount" INTEGER NOT NULL DEFAULT 1,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gridlock_solves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gridlock_solves_puzzleId_idx" ON "gridlock_solves"("puzzleId");

-- CreateIndex
CREATE INDEX "gridlock_solves_puzzleId_rank_idx" ON "gridlock_solves"("puzzleId", "rank");

-- AddForeignKey
ALTER TABLE "gridlock_solves" ADD CONSTRAINT "gridlock_solves_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gridlock_solves" ADD CONSTRAINT "gridlock_solves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
