import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Creating item_definitions table if missing...');
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS item_definitions (
      id text PRIMARY KEY,
      "escapeRoomId" text NOT NULL,
      key text UNIQUE,
      name text,
      description text,
      "imageUrl" text,
      consumable boolean DEFAULT true,
      "createdAt" timestamptz DEFAULT now()
    );`);

    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE item_definitions ADD CONSTRAINT IF NOT EXISTS fk_itemdef_escaperoom FOREIGN KEY ("escapeRoomId") REFERENCES escape_room_puzzles(id) ON DELETE CASCADE;`);
    } catch (_) {}

    console.log('Done.');
  } catch (e) {
    console.error('Failed creating item_definitions:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
