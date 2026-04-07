import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

const prisma = new PrismaClient();

const email = process.argv[2] || 'admin@puzzlewarz.com';
const password = process.argv[3] || 'Admin1234!';

const hash = await bcrypt.hash(password, 12);

const user = await prisma.user.upsert({
  where: { email },
  update: { password: hash, role: 'admin', name: 'Admin' },
  create: { email, password: hash, role: 'admin', name: 'Admin' },
});

console.log('✅ Admin user ready:');
console.log('   Email:   ', user.email);
console.log('   Password:', password);
console.log('   Role:    ', user.role);

await prisma.$disconnect();
