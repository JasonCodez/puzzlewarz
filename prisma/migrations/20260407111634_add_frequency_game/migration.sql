-- AlterTable
ALTER TABLE "store_items" ADD COLUMN     "isExclusive" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "teams" ADD COLUMN     "activeTheme" TEXT NOT NULL DEFAULT 'default';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "premiumPrice" INTEGER NOT NULL DEFAULT 500,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_tiers" (
    "id" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "tierNumber" INTEGER NOT NULL,
    "xpRequired" INTEGER NOT NULL,
    "freeRewardType" TEXT,
    "freeRewardKey" TEXT,
    "freeRewardQty" INTEGER NOT NULL DEFAULT 0,
    "premRewardType" TEXT,
    "premRewardKey" TEXT,
    "premRewardQty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "season_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_season_passes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "seasonXp" INTEGER NOT NULL DEFAULT 0,
    "currentTier" INTEGER NOT NULL DEFAULT 0,
    "claimedFree" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "claimedPrem" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "purchasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_season_passes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequency_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "scheduledFor" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frequency_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequency_answers" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "displayText" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "frequency_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frequency_submissions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "frequency_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "seasons_isActive_idx" ON "seasons"("isActive");

-- CreateIndex
CREATE INDEX "seasons_startDate_endDate_idx" ON "seasons"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "season_tiers_seasonId_idx" ON "season_tiers"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "season_tiers_seasonId_tierNumber_key" ON "season_tiers"("seasonId", "tierNumber");

-- CreateIndex
CREATE INDEX "user_season_passes_userId_idx" ON "user_season_passes"("userId");

-- CreateIndex
CREATE INDEX "user_season_passes_seasonId_idx" ON "user_season_passes"("seasonId");

-- CreateIndex
CREATE UNIQUE INDEX "user_season_passes_userId_seasonId_key" ON "user_season_passes"("userId", "seasonId");

-- CreateIndex
CREATE INDEX "frequency_questions_status_idx" ON "frequency_questions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "frequency_questions_scheduledFor_key" ON "frequency_questions"("scheduledFor");

-- CreateIndex
CREATE INDEX "frequency_answers_questionId_idx" ON "frequency_answers"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "frequency_answers_questionId_text_key" ON "frequency_answers"("questionId", "text");

-- CreateIndex
CREATE INDEX "frequency_submissions_questionId_idx" ON "frequency_submissions"("questionId");

-- CreateIndex
CREATE INDEX "frequency_submissions_userId_idx" ON "frequency_submissions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "frequency_submissions_questionId_userId_key" ON "frequency_submissions"("questionId", "userId");

-- AddForeignKey
ALTER TABLE "season_tiers" ADD CONSTRAINT "season_tiers_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_season_passes" ADD CONSTRAINT "user_season_passes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_season_passes" ADD CONSTRAINT "user_season_passes_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequency_answers" ADD CONSTRAINT "frequency_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "frequency_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequency_submissions" ADD CONSTRAINT "frequency_submissions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "frequency_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "frequency_submissions" ADD CONSTRAINT "frequency_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
