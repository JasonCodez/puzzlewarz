#!/usr/bin/env node

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertAdmin(email: string, password: string) {
  try {
    if (!email || !password) {
      console.error("❌ Email and password are required. Usage: npx tsx scripts/make-admin.ts <email> <password>");
      process.exit(1);
    }

    const name = "Admin";
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { password: hashedPassword, role: "admin", name },
      create: {
        email,
        password: hashedPassword,
        role: "admin",
        name,
      },
    });

    console.log(`✅ Admin user created or updated: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role}`);
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

const email = process.argv[2] || "admin@puzzlewarz.com";
const password = process.argv[3] || "Arm4469nine2686tee!";
upsertAdmin(email, password);
