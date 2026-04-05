-- AlterTable
ALTER TABLE "puzzle_warz_challenges" ADD COLUMN     "spotlightUntil" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "activeFlair" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "activeFrame" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "activeSkin" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "activeTheme" TEXT NOT NULL DEFAULT 'default',
ADD COLUMN     "hintTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "skipTokens" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streakShields" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "teamBannerColor" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "warzChallengeSlots" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "warzRematchTokens" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "store_items" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "isConsumable" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "iconEmoji" TEXT NOT NULL DEFAULT '🎁',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_inventory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_items_key_key" ON "store_items"("key");

-- CreateIndex
CREATE INDEX "user_inventory_userId_idx" ON "user_inventory"("userId");

-- CreateIndex
CREATE INDEX "user_inventory_itemId_idx" ON "user_inventory"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "user_inventory_userId_itemId_key" ON "user_inventory"("userId", "itemId");

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "store_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
