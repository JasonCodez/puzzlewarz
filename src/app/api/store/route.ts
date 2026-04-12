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

    const [inventory, user] = await Promise.all([
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
          activeNameColor: true,
          activeCompletionAnimation: true,
          streakShields: true,
          hintTokens: true,
          skipTokens: true,
          warzChallengeSlots: true,
          warzRematchTokens: true,
          tripleOrNothingTokens: true,
          tripleOrNothingActive: true,
          xpBoostExpiresAt: true,
        },
      }),
    ]);

    const inventoryMap = Object.fromEntries(inventory.map((i) => [i.itemId, i.quantity]));

    // Only fetch non-exclusive items for the store; exclusive items are managed via the profile page
    const items = await prisma.storeItem.findMany({
      where: { isActive: true, isExclusive: false },
      orderBy: [{ category: "asc" }, { price: "asc" }],
    });

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
