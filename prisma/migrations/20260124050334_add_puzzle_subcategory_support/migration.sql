-- AlterTable
ALTER TABLE "puzzles" ADD COLUMN     "subcategoryId" TEXT;

-- CreateTable
CREATE TABLE "puzzle_subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puzzle_subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "puzzle_subcategories_name_categoryId_key" ON "puzzle_subcategories"("name", "categoryId");

-- AddForeignKey
ALTER TABLE "puzzle_subcategories" ADD CONSTRAINT "puzzle_subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "puzzle_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "puzzles" ADD CONSTRAINT "puzzles_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "puzzle_subcategories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
