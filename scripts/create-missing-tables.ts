import "dotenv/config";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  try {
    console.log('Creating missing tables room_layouts and hotspots if they do not exist...');
    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS room_layouts (
        id text PRIMARY KEY,
        "escapeRoomId" text NOT NULL,
        title text,
        "backgroundUrl" text,
        width integer,
        height integer,
        "createdAt" timestamptz DEFAULT now(),
        "updatedAt" timestamptz DEFAULT now()
      );`);

    await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS hotspots (
        id text PRIMARY KEY,
        "layoutId" text NOT NULL,
        x integer DEFAULT 0,
        y integer DEFAULT 0,
        w integer DEFAULT 32,
        h integer DEFAULT 32,
        type text DEFAULT 'interactive',
        "targetId" text,
        meta text,
        "createdAt" timestamptz DEFAULT now()
      );`);

    // Add foreign keys if possible; ignore errors if they already exist
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE room_layouts ADD CONSTRAINT IF NOT EXISTS fk_roomlayout_escaperoom FOREIGN KEY ("escapeRoomId") REFERENCES escape_room_puzzles(id) ON DELETE CASCADE;`);
    } catch (_) { }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE hotspots ADD CONSTRAINT IF NOT EXISTS fk_hotspot_layout FOREIGN KEY ("layoutId") REFERENCES room_layouts(id) ON DELETE CASCADE;`);
    } catch (_) { }

    console.log('Done creating tables (if they were missing).');
  } catch (e) {
    console.error('Failed creating missing tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
