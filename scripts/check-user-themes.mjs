import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
const users = await p.user.findMany({ select: { name: true, email: true, activeTheme: true, activeFrame: true, activeSkin: true, activeFlair: true } });
console.log(JSON.stringify(users, null, 2));
await p.$disconnect();
