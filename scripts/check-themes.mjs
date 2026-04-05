import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const items = await p.storeItem.findMany({ where: { subcategory: 'theme' }, select: { key: true, name: true, metadata: true } });
console.log(JSON.stringify(items, null, 2));
await p.$disconnect();
