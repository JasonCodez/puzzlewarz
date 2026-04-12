import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * POST /api/store/use/streak-recovery
 * Restores a broken streak using one streak recovery token.
 * Requirements:
 * - User must have at least 1 streak_recovery token in their inventory.
 * - The streak must be broken (currentStreak === 0 or lastSolveDate > 1 day ago).
 * - lastSolveDate must be within 3 days (grace period).
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    // Find the streak_recovery store item
    const storeItem = await prisma.storeItem.findUnique({ where: { key: "streak_recovery" } });
    if (!storeItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // Check inventory
    const inventory = await prisma.userInventory.findUnique({
      where: { userId_itemId: { userId: currentUser.id, itemId: storeItem.id } },
    });
    if (!inventory || inventory.quantity < 1) {
      return NextResponse.json({ error: "No streak recovery tokens. Purchase one in the Store." }, { status: 400 });
    }

    // Check streak state
    const streak = await prisma.userStreak.findUnique({ where: { userId: currentUser.id } });
    const now = new Date();
    const graceDays = (storeItem.metadata as { graceDays?: number } | null)?.graceDays ?? 3;

    if (!streak || !streak.lastSolveDate) {
      return NextResponse.json({ error: "No streak to recover." }, { status: 400 });
    }

    const daysSinceLastSolve = (now.getTime() - streak.lastSolveDate.getTime()) / 86_400_000;

    if (daysSinceLastSolve < 1) {
      return NextResponse.json({ error: "Your streak is still active — no recovery needed." }, { status: 400 });
    }
    if (daysSinceLastSolve > graceDays + 1) {
      return NextResponse.json(
        { error: `Streak recovery can only be used within ${graceDays} days of breaking your streak.` },
        { status: 400 }
      );
    }

    // Restore to the streak value before the break (or at least 1)
    const restoreStreak = Math.max(streak.lastStreakBeforeBreak ?? 0, streak.currentStreak, 1);
    const newLongest = Math.max(restoreStreak, streak.longestStreak);

    // Set lastSolveDate to yesterday so tomorrow's solve continues the streak
    const yesterday = new Date(now.getTime() - 86_400_000);

    await prisma.$transaction([
      // Consume the inventory token
      prisma.userInventory.update({
        where: { userId_itemId: { userId: currentUser.id, itemId: storeItem.id } },
        data: { quantity: { decrement: 1 } },
      }),
      // Restore streak
      prisma.userStreak.update({
        where: { userId: currentUser.id },
        data: {
          currentStreak: restoreStreak,
          longestStreak: newLongest,
          lastSolveDate: yesterday,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      restoredStreak: restoreStreak,
    });
  } catch (err) {
    console.error("[STREAK RECOVERY]", err);
    return NextResponse.json({ error: "Failed to recover streak" }, { status: 500 });
  }
}
