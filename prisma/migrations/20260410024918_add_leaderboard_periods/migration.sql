-- CreateTable
CREATE TABLE "leaderboard_periods" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "leaderboard_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_rewards" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL,
    "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leaderboard_periods_type_endsAt_idx" ON "leaderboard_periods"("type", "endsAt");

-- CreateIndex
CREATE INDEX "leaderboard_rewards_periodId_idx" ON "leaderboard_rewards"("periodId");

-- CreateIndex
CREATE INDEX "leaderboard_rewards_userId_idx" ON "leaderboard_rewards"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_rewards_periodId_userId_key" ON "leaderboard_rewards"("periodId", "userId");

-- AddForeignKey
ALTER TABLE "leaderboard_rewards" ADD CONSTRAINT "leaderboard_rewards_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "leaderboard_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_rewards" ADD CONSTRAINT "leaderboard_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
