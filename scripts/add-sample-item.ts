import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function run() {
  const puzzleId = process.argv[2] || "cmkniucb00002m1n0i8mwkyef";
  try {
    const er = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId } });
    if (!er) return console.error('Escape room not found for', puzzleId);

    // Create an item definition
    const item = await prisma.itemDefinition.create({
      data: {
        escapeRoomId: er.id,
        key: 'old_key',
        name: 'Old Key',
        description: 'A small rusty key found in the office',
        imageUrl: '/images/old-key.png',
        consumable: false,
      },
    });
    console.log('Created item', item.id, 'key=', item.key);

    // Find a pickup hotspot and attach the item
    let pickupHs = await prisma.hotspot.findFirst({ where: { type: 'pickup' } }).catch(() => null);
    if (!pickupHs) {
      pickupHs = await prisma.hotspot.findFirst({ where: { meta: { contains: 'Old Key' } } }).catch(() => null);
    }

    if (!pickupHs) return console.error('No pickup hotspot found to attach item to');

    await prisma.hotspot.update({ where: { id: pickupHs.id }, data: { targetId: item.id } });
    console.log('Linked item to hotspot', pickupHs.id);
  } catch (e) {
    console.error('Failed to create sample item or link to hotspot', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
