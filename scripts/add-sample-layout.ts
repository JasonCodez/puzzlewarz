import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function addSample(puzzleIdArg?: string) {
  const puzzleId = puzzleIdArg || process.argv[2] || "cmkniucb00002m1n0i8mwkyef";
  try {
    const er = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId } });
    if (!er) return console.error('Escape room not found for puzzleId', puzzleId);

    console.log('Creating sample layout for escapeRoom id=', er.id);

    const layout = await prisma.roomLayout.create({
      data: {
        escapeRoomId: er.id,
        title: 'Detective Office - Sample Layout',
        backgroundUrl: '/images/detective-office.jpg',
        width: 1200,
        height: 800,
      },
    });

    console.log('Created layout', layout.id);

    const hotspots = [
      { x: 200, y: 150, w: 80, h: 80, type: 'pickup', meta: JSON.stringify({ label: 'Old Key' }) },
      { x: 600, y: 350, w: 120, h: 90, type: 'interactive', meta: JSON.stringify({ label: 'Desk Drawer' }) },
      { x: 980, y: 220, w: 60, h: 60, type: 'pickup', meta: JSON.stringify({ label: 'Photograph' }) },
    ];

    for (const hs of hotspots) {
      const created = await prisma.hotspot.create({ data: { layoutId: layout.id, x: hs.x, y: hs.y, w: hs.w, h: hs.h, type: hs.type, meta: hs.meta } });
      console.log('  hotspot created', created.id);
    }

    console.log('Sample layout and hotspots created.');
  } catch (e: any) {
    // Prisma error when table not found
    if (e && e.code === 'P2021') {
      console.error('Database missing required tables (room_layouts/hotspots). Run migrations:');
      console.error('  npx prisma migrate deploy --preview-feature');
      console.error('or for development:');
      console.error('  npx prisma migrate dev --name add-escape-room-editor');
    } else {
      console.error('Failed to create sample layout:', e);
    }
  } finally {
    await prisma.$disconnect();
  }
}

addSample();
