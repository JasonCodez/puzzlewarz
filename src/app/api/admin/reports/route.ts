import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { role: true },
  });
  return user?.role === "admin" ? user : null;
}

// GET /api/admin/reports — list reports with optional ?status= filter
export async function GET(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "pending";

  const reports = await prisma.userReport.findMany({
    where: status === "all" ? {} : { status },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      issuer: { select: { id: true, name: true, email: true } },
      target: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(reports);
}

// PATCH /api/admin/reports — update a report's status
export async function PATCH(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const session = await getServerSession(authOptions);
  const reviewer = await prisma.user.findUnique({
    where: { email: session!.user!.email! },
    select: { id: true },
  });

  const body = await request.json();
  const { id, status } = body;

  if (!id || !["reviewed", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const updated = await prisma.userReport.update({
    where: { id },
    data: { status, reviewedAt: new Date(), reviewedBy: reviewer?.id },
  });

  return NextResponse.json(updated);
}
