import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

/**
 * GET /api/store/inventory
 * Returns the current user's owned store items with full item details.
 */
export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const inventory = await prisma.userInventory.findMany({
      where: { userId: currentUser.id },
      include: {
        item: {
          select: {
            id: true,
            key: true,
            name: true,
            subcategory: true,
            category: true,
            iconEmoji: true,
            metadata: true,
          },
        },
      },
    });

    return NextResponse.json({ items: inventory });
  } catch (err) {
    console.error("[STORE INVENTORY]", err);
    return NextResponse.json({ error: "Failed to fetch inventory" }, { status: 500 });
  }
}
