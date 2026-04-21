import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * POST /api/store/equip
 * Body: { itemKey: string }
 *
 * Sets the active cosmetic for the user. User must own the item.
 * For "none"/"default" values, unequips the slot.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { itemKey } = (await request.json()) as { itemKey: string };
    if (!itemKey) return NextResponse.json({ error: "itemKey required" }, { status: 400 });

    // Allow unequip shortcuts
    const UNEQUIP_KEYS: Record<string, Record<string, string>> = {
      theme:      { activeTheme: "default" },
      frame:      { activeFrame: "none" },
      skin:       { activeSkin: "default" },
      flair:      { activeFlair: "none" },
      banner:     { teamBannerColor: "none" },
      name_color: { activeNameColor: "none" },
      anim:       { activeCompletionAnimation: "default" },
      title:      { activeTitle: "none" },
    };

    for (const [subcat, update] of Object.entries(UNEQUIP_KEYS)) {
      if (itemKey === `unequip_${subcat}`) {
        await prisma.user.update({ where: { id: currentUser.id }, data: update });
        return NextResponse.json({ success: true });
      }
    }

    // Special: equip the Founder title (not a store item — granted at registration)
    if (itemKey === "equip_founder_title") {
      const user = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { isFounder: true },
      });
      if (!user?.isFounder) {
        return NextResponse.json({ error: "You do not have the Founder title" }, { status: 403 });
      }
      await prisma.user.update({ where: { id: currentUser.id }, data: { activeTitle: "founder" } });
      return NextResponse.json({ success: true, equipped: "founder" });
    }

    const item = await prisma.storeItem.findUnique({ where: { key: itemKey } });
    if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    // Only cosmetic items can be equipped
    const EQUIPPABLE = ["theme", "frame", "skin", "flair", "banner", "name_color", "anim"];
    if (!EQUIPPABLE.includes(item.subcategory)) {
      return NextResponse.json({ error: "This item cannot be equipped" }, { status: 400 });
    }

    // Check ownership
    const owned = await prisma.userInventory.findUnique({
      where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
    });
    if (!owned) {
      return NextResponse.json({ error: "You do not own this item" }, { status: 403 });
    }

    const meta = item.metadata as { value?: string; emoji?: string } | null;
    // For flair items, store the emoji character so it renders correctly next to usernames.
    // For all other subcategories, use the plain value identifier.
    const value = item.subcategory === "flair"
      ? (meta?.emoji ?? meta?.value ?? item.key)
      : (meta?.value ?? item.key);

    const fieldMap: Record<string, string> = {
      theme:      "activeTheme",
      frame:      "activeFrame",
      skin:       "activeSkin",
      flair:      "activeFlair",
      banner:     "teamBannerColor",
      name_color: "activeNameColor",
      anim:       "activeCompletionAnimation",
    };

    await prisma.user.update({
      where: { id: currentUser.id },
      data: { [fieldMap[item.subcategory]]: value },
    });

    return NextResponse.json({ success: true, equipped: value });
  } catch (err) {
    console.error("[STORE EQUIP]", err);
    return NextResponse.json({ error: "Failed to equip item" }, { status: 500 });
  }
}
