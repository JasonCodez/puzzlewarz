import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

/**
 * GET /api/store
 * Returns all active store items with the user's ownership/quantity info.
 */
export async function GET(_request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const [items, inventory, user] = await Promise.all([
      prisma.storeItem.findMany({
        where: { isActive: true },
        orderBy: [{ category: "asc" }, { price: "asc" }],
      }),
      prisma.userInventory.findMany({
        where: { userId: currentUser.id },
        select: { itemId: true, quantity: true },
      }),
      prisma.user.findUnique({
        where: { id: currentUser.id },
        select: {
          totalPoints: true,
          activeTheme: true,
          activeFrame: true,
          activeSkin: true,
          activeFlair: true,
          teamBannerColor: true,
          streakShields: true,
          hintTokens: true,
          skipTokens: true,
          warzChallengeSlots: true,
          warzRematchTokens: true,
        },
      }),
    ]);

    const inventoryMap = Object.fromEntries(inventory.map((i) => [i.itemId, i.quantity]));

    const itemsWithOwnership = items.map((item) => ({
      ...item,
      owned: inventoryMap[item.id] ?? 0,
    }));

    return NextResponse.json({ items: itemsWithOwnership, user, balance: user?.totalPoints ?? 0 });
  } catch (err) {
    console.error("[STORE GET]", err);
    return NextResponse.json({ error: "Failed to load store" }, { status: 500 });
  }
}
