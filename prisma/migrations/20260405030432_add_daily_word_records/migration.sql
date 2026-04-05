-- CreateTable
CREATE TABLE "daily_word_records" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "won" BOOLEAN NOT NULL,
    "guesses" INTEGER NOT NULL,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "shieldUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_word_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_word_records_userId_idx" ON "daily_word_records"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "daily_word_records_userId_dayNumber_key" ON "daily_word_records"("userId", "dayNumber");

-- AddForeignKey
ALTER TABLE "daily_word_records" ADD CONSTRAINT "daily_word_records_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
