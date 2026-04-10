-- CreateTable
CREATE TABLE "witness_results" (
    "id" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "witness_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dead_drop_results" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "solved" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dead_drop_results_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "witness_results_scenarioId_idx" ON "witness_results"("scenarioId");

-- CreateIndex
CREATE INDEX "dead_drop_results_challengeId_idx" ON "dead_drop_results"("challengeId");
