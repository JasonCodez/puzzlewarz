import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { currentPassword, newPassword } = body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Both fields are required" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user?.password) {
    return NextResponse.json({ error: "No password set on this account. Use your sign-in provider to change credentials." }, { status: 400 });
  }

  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

  return NextResponse.json({ success: true });
}
