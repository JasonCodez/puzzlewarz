-- CreateTable
CREATE TABLE "guest_daily_word_solves" (
    "id" TEXT NOT NULL,
    "anonId" TEXT NOT NULL,
    "userId" TEXT,
    "dayNumber" INTEGER NOT NULL,
    "guesses" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "rewardPoints" INTEGER NOT NULL,
    "streakDay" INTEGER NOT NULL,
    "solvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guest_daily_word_solves_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "guest_daily_word_solves_anonId_idx" ON "guest_daily_word_solves"("anonId");

-- CreateIndex
CREATE INDEX "guest_daily_word_solves_userId_idx" ON "guest_daily_word_solves"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "guest_daily_word_solves_anonId_dayNumber_key" ON "guest_daily_word_solves"("anonId", "dayNumber");

-- AddForeignKey
ALTER TABLE "guest_daily_word_solves" ADD CONSTRAINT "guest_daily_word_solves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
