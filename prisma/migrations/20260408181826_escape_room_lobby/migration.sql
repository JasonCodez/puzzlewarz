-- AlterTable
ALTER TABLE "TeamEscapeProgress" ADD COLUMN     "lobbyId" TEXT,
ALTER COLUMN "teamId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "escape_room_lobbies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "maxPlayers" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),

    CONSTRAINT "escape_room_lobbies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escape_room_lobby_members" (
    "id" TEXT NOT NULL,
    "lobbyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escape_room_lobby_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "escape_room_lobbies_code_key" ON "escape_room_lobbies"("code");

-- CreateIndex
CREATE INDEX "escape_room_lobbies_puzzleId_idx" ON "escape_room_lobbies"("puzzleId");

-- CreateIndex
CREATE INDEX "escape_room_lobbies_hostId_idx" ON "escape_room_lobbies"("hostId");

-- CreateIndex
CREATE INDEX "escape_room_lobby_members_userId_idx" ON "escape_room_lobby_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "escape_room_lobby_members_lobbyId_userId_key" ON "escape_room_lobby_members"("lobbyId", "userId");

-- CreateIndex
CREATE INDEX "TeamEscapeProgress_lobbyId_escapeRoomId_idx" ON "TeamEscapeProgress"("lobbyId", "escapeRoomId");

-- AddForeignKey
ALTER TABLE "TeamEscapeProgress" ADD CONSTRAINT "TeamEscapeProgress_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "escape_room_lobbies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_room_lobbies" ADD CONSTRAINT "escape_room_lobbies_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_room_lobbies" ADD CONSTRAINT "escape_room_lobbies_puzzleId_fkey" FOREIGN KEY ("puzzleId") REFERENCES "puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_room_lobby_members" ADD CONSTRAINT "escape_room_lobby_members_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "escape_room_lobbies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_room_lobby_members" ADD CONSTRAINT "escape_room_lobby_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
