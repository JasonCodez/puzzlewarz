import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function check() {
  try {
    const res: any = await prisma.$queryRawUnsafe(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('room_layouts','hotspots');`
    );
    console.log('Found tables:', res.map((r: any) => r.table_name));
  } catch (e) {
    console.error('Error checking tables:', e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
