import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";

/**
 * GET /api/user/exclusive-cosmetics
 * Returns exclusive StoreItems the user has in their inventory (e.g. season pass rewards).
 */
export async function GET() {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const inventory = await prisma.userInventory.findMany({
      where: { userId: currentUser.id },
      select: { itemId: true, quantity: true },
    });

    if (inventory.length === 0) {
      return NextResponse.json({ items: [] });
    }

    const ownedItemIds = inventory.map((i) => i.itemId);
    const inventoryMap = Object.fromEntries(inventory.map((i) => [i.itemId, i.quantity]));

    const exclusiveItems = await prisma.storeItem.findMany({
      where: {
        isActive: true,
        isExclusive: true,
        id: { in: ownedItemIds },
      },
      orderBy: [{ subcategory: "asc" }, { name: "asc" }],
    });

    const items = exclusiveItems.map((item) => ({
      ...item,
      owned: inventoryMap[item.id] ?? 0,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error("[EXCLUSIVE COSMETICS]", err);
    return NextResponse.json({ error: "Failed to load exclusive cosmetics" }, { status: 500 });
  }
}
