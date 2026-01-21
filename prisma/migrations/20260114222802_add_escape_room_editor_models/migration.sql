-- CreateTable
CREATE TABLE "room_layouts" (
    "id" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "title" TEXT,
    "backgroundUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotspots" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "x" INTEGER NOT NULL DEFAULT 0,
    "y" INTEGER NOT NULL DEFAULT 0,
    "w" INTEGER NOT NULL DEFAULT 32,
    "h" INTEGER NOT NULL DEFAULT 32,
    "type" TEXT NOT NULL DEFAULT 'interactive',
    "targetId" TEXT,
    "meta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotspots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escape_locks" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "lockType" TEXT NOT NULL DEFAULT 'code',
    "requirement" TEXT,
    "secret" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT true,
    "requiredItemKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escape_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_definitions" (
    "id" TEXT NOT NULL,
    "escapeRoomId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "consumable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_triggers" (
    "id" TEXT NOT NULL,
    "layoutId" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "condition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_triggers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_room_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "teamId" TEXT,
    "escapeRoomId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_room_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_layouts_escapeRoomId_idx" ON "room_layouts"("escapeRoomId");

-- CreateIndex
CREATE INDEX "hotspots_layoutId_idx" ON "hotspots"("layoutId");

-- CreateIndex
CREATE INDEX "escape_locks_layoutId_idx" ON "escape_locks"("layoutId");

-- CreateIndex
CREATE UNIQUE INDEX "item_definitions_key_key" ON "item_definitions"("key");

-- CreateIndex
CREATE INDEX "item_definitions_escapeRoomId_idx" ON "item_definitions"("escapeRoomId");

-- CreateIndex
CREATE INDEX "room_triggers_layoutId_idx" ON "room_triggers"("layoutId");

-- CreateIndex
CREATE INDEX "player_room_states_userId_idx" ON "player_room_states"("userId");

-- CreateIndex
CREATE INDEX "player_room_states_teamId_idx" ON "player_room_states"("teamId");

-- CreateIndex
CREATE INDEX "player_room_states_escapeRoomId_idx" ON "player_room_states"("escapeRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "player_room_states_userId_escapeRoomId_key" ON "player_room_states"("userId", "escapeRoomId");

-- AddForeignKey
ALTER TABLE "room_layouts" ADD CONSTRAINT "room_layouts_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotspots" ADD CONSTRAINT "hotspots_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "room_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escape_locks" ADD CONSTRAINT "escape_locks_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "room_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_definitions" ADD CONSTRAINT "item_definitions_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_triggers" ADD CONSTRAINT "room_triggers_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "room_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_room_states" ADD CONSTRAINT "player_room_states_escapeRoomId_fkey" FOREIGN KEY ("escapeRoomId") REFERENCES "escape_room_puzzles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
