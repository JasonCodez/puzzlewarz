import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function inspect() {
  const id = process.argv[2] || "cmkniucb00002m1n0i8mwkyef";
  try {
    const base = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId: id }, select: { id: true, puzzleId: true, roomTitle: true, timeLimitSeconds: true } });
    if (!base) {
      console.log('Escape room not found for puzzleId', id);
      return;
    }
    console.log('EscapeRoom:', { id: base.id, puzzleId: base.puzzleId, roomTitle: base.roomTitle, timeLimitSeconds: base.timeLimitSeconds });

    const stages = await prisma.escapeStage.findMany({ where: { escapeRoomId: base.id }, orderBy: { order: 'asc' } });
    console.log('Stages:');
    for (const s of stages) {
      console.log(`  [${s.order}] ${s.title} (id=${s.id})`);
    }

    // Try to fetch layouts/hotspots if the tables exist
    try {
      const layouts = await prisma.roomLayout.findMany({ where: { escapeRoomId: base.id }, include: { hotspots: true } });
      console.log('Layouts:');
      for (const l of layouts) {
        console.log(`  layout ${l.id} (${l.title || 'untitled'}) size=${l.width}x${l.height} background=${l.backgroundUrl}`);
        console.log('    hotspots:');
        for (const h of l.hotspots) {
          console.log(`      - ${h.id} type=${h.type} x=${h.x} y=${h.y} w=${h.w} h=${h.h} meta=${h.meta}`);
        }
      }
    } catch (le) {
      console.log('Layouts/hotspots not available in DB (possibly missing migration).');
    }
  } catch (e) {
    console.error('Inspect error', e);
  } finally {
    await prisma.$disconnect();
  }
}

inspect();
