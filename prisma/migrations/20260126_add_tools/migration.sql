-- Restored migration (was applied to DB but missing locally)

-- CreateTable
CREATE TABLE "tools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "metadata" JSONB,
    "cooldownSeconds" INTEGER,
    "costPoints" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tools" (
    "id" TEXT NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "remainingUses" INTEGER,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "user_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tool_usages" (
    "id" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puzzleId" TEXT,
    "teamId" TEXT,
    "toolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "tool_usages_pkey" PRIMARY KEY ("id")
);
