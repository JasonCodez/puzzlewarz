const { PrismaClient } = require('../node_modules/.prisma/client');
const p = new PrismaClient();

async function main() {
  // Remove from any user inventories first (FK constraint)
  const item = await p.storeItem.findUnique({ where: { key: 'warz_rematch' } });
  if (item) {
    await p.userInventory.deleteMany({ where: { itemId: item.id } });
    await p.storeItem.delete({ where: { key: 'warz_rematch' } });
    console.log('Deleted warz_rematch and its inventory records');
  } else {
    console.log('warz_rematch not found in DB');
  }
  await p.$disconnect();
}

main();
