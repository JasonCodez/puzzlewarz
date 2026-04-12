import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

// GET /api/users/search?q=<query>&limit=<n>
// Simple username/name search for the invite flow.
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const limit = Math.min(20, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") ?? "10")));

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUser.id } },
          { isHidden: false },
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: { id: true, name: true, image: true },
      take: limit,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        username: u.name ?? "Unknown",
        avatarUrl: u.image,
      })),
    });
  } catch (err) {
    console.error("[USERS SEARCH]", err);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
