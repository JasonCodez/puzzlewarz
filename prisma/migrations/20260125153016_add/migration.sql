-- AlterTable
ALTER TABLE "escape_room_puzzles" ADD COLUMN     "maxTeamSize" INTEGER NOT NULL DEFAULT 6,
ADD COLUMN     "minTeamSize" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "RoleDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "specialty" TEXT NOT NULL,
    "abilities" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamEscapeProgress" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "currentStageIndex" INTEGER NOT NULL DEFAULT 0,
    "solvedStages" TEXT NOT NULL DEFAULT '[]',
    "inventory" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "TeamEscapeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TeamEscapeProgress_teamId_escapeRoomId_key" ON "TeamEscapeProgress"("teamId", "escapeRoomId");

-- AddForeignKey
ALTER TABLE "TeamEscapeProgress" ADD CONSTRAINT "TeamEscapeProgress_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamEscapeProgress" ADD CONSTRAINT "TeamEscapeProgress_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
