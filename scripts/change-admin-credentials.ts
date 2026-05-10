#!/usr/bin/env node

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import path from "path";
import { config } from "dotenv";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

type BasicUser = {
  id: string;
  email: string | null;
  role: string;
  name: string | null;
};

function generateUserId() {
  return `support_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function changeAdminCredentials(newEmail: string, newPassword: string, oldEmail: string) {
  if (!newEmail || !newPassword || !oldEmail) {
    console.error("Usage: npx tsx scripts/change-admin-credentials.ts <newEmail> <newPassword> [oldEmail]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const oldUsers = await prisma.$queryRaw<BasicUser[]>`
    SELECT id, email, role, name
    FROM users
    WHERE email = ${oldEmail}
    LIMIT 1
  `;

  const oldUser = oldUsers[0] ?? null;

  const newUser = oldEmail === newEmail
    ? oldUser
    : (await prisma.$queryRaw<BasicUser[]>`
      SELECT id, email, role, name
      FROM users
      WHERE email = ${newEmail}
      LIMIT 1
    `)[0] ?? null;

  if (oldUser && newUser && oldUser.id !== newUser.id) {
    console.error("Conflict: both old and new email accounts exist as different users.");
    console.error(`Old: ${oldEmail} (id=${oldUser.id})`);
    console.error(`New: ${newEmail} (id=${newUser.id})`);
    console.error("Resolve manually, then re-run this script.");
    process.exit(1);
  }

  if (oldUser && (!newUser || oldUser.id === newUser.id)) {
    await prisma.$executeRaw`
      UPDATE users
      SET email = ${newEmail},
          password = ${passwordHash},
          role = 'admin',
          name = COALESCE(name, 'Support')
      WHERE id = ${oldUser.id}
    `;

    const updated = (await prisma.$queryRaw<BasicUser[]>`
      SELECT id, email, role, name
      FROM users
      WHERE id = ${oldUser.id}
      LIMIT 1
    `)[0];

    console.log("Updated existing admin account:");
    console.log(JSON.stringify(updated, null, 2));
  } else if (newUser) {
    await prisma.$executeRaw`
      UPDATE users
      SET password = ${passwordHash},
          role = 'admin',
          name = COALESCE(name, 'Support')
      WHERE id = ${newUser.id}
    `;

    const updated = (await prisma.$queryRaw<BasicUser[]>`
      SELECT id, email, role, name
      FROM users
      WHERE id = ${newUser.id}
      LIMIT 1
    `)[0];

    console.log("Updated existing new-email account:");
    console.log(JSON.stringify(updated, null, 2));
  } else {
    const id = generateUserId();

    await prisma.$executeRaw`
      INSERT INTO users (id, email, password, role, name)
      VALUES (${id}, ${newEmail}, ${passwordHash}, 'admin', 'Support')
    `;

    const created = (await prisma.$queryRaw<BasicUser[]>`
      SELECT id, email, role, name
      FROM users
      WHERE id = ${id}
      LIMIT 1
    `)[0];

    console.log("Created new admin account:");
    console.log(JSON.stringify(created, null, 2));
  }

  const verification = await prisma.$queryRaw<BasicUser[]>`
    SELECT id, email, role, name
    FROM users
    WHERE email = ${oldEmail} OR email = ${newEmail}
    ORDER BY email ASC
  `;

  console.log("Verification:");
  console.log(JSON.stringify(verification, null, 2));
}

const newEmail = process.argv[2] || "support@puzzlewarz.com";
const newPassword = process.argv[3];
const oldEmail = process.argv[4] || "admin@puzzlewarz.com";

changeAdminCredentials(newEmail, newPassword, oldEmail)
  .catch((error) => {
    console.error("Failed to change admin credentials:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
