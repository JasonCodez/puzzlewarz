-- CreateTable
CREATE TABLE "lobby_messages" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "puzzleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lobby_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lobby_messages_teamId_puzzleId_idx" ON "lobby_messages"("teamId", "puzzleId");

-- CreateIndex
CREATE INDEX "lobby_messages_userId_idx" ON "lobby_messages"("userId");

-- AddForeignKey
ALTER TABLE "lobby_messages" ADD CONSTRAINT "lobby_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
