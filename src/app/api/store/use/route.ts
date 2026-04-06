import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * POST /api/store/use
 * Body: { itemKey: string, targetId?: string }
 *
 * Consumes a one-use token against a target (e.g. a Warz challenge).
 * Supported:
 *   warz_extend_expiry  — targetId = challengeId
 *   warz_spotlight      — targetId = challengeId
 *   warz_rematch        — targetId = opponentUserId (creates rematch challenge request)
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { itemKey, targetId } = (await request.json()) as {
      itemKey: string;
      targetId?: string;
    };

    if (!itemKey) return NextResponse.json({ error: "itemKey required" }, { status: 400 });

    const item = await prisma.storeItem.findUnique({ where: { key: itemKey } });
    if (!item || !item.isConsumable) {
      return NextResponse.json({ error: "Item not found or not consumable" }, { status: 404 });
    }

    const owned = await prisma.userInventory.findUnique({
      where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
    });
    if (!owned || owned.quantity < 1) {
      return NextResponse.json({ error: `You don't have any ${item.name}` }, { status: 400 });
    }

    // ── warz_extend_expiry ─────────────────────────────────────────────
    if (itemKey === "warz_extend_expiry") {
      if (!targetId) return NextResponse.json({ error: "targetId (challengeId) required" }, { status: 400 });

      const challenge = await prisma.puzzleWarzChallenge.findFirst({
        where: { id: targetId, challengerId: currentUser.id, status: "OPEN" },
      });
      if (!challenge) {
        return NextResponse.json({ error: "Open challenge not found" }, { status: 404 });
      }

      const meta = item.metadata as { extraHours?: number } | null;
      const extraMs = (meta?.extraHours ?? 48) * 60 * 60 * 1000;
      const newExpiry = new Date(challenge.expiresAt.getTime() + extraMs);

      await prisma.$transaction([
        prisma.puzzleWarzChallenge.update({
          where: { id: targetId },
          data: { expiresAt: newExpiry },
        }),
        prisma.userInventory.update({
          where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
          data: { quantity: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({ success: true, newExpiry });
    }

    // ── warz_spotlight ─────────────────────────────────────────────────
    if (itemKey === "warz_spotlight") {
      if (!targetId) return NextResponse.json({ error: "targetId (challengeId) required" }, { status: 400 });

      const challenge = await prisma.puzzleWarzChallenge.findFirst({
        where: { id: targetId, challengerId: currentUser.id, status: "OPEN" },
      });
      if (!challenge) {
        return NextResponse.json({ error: "Open challenge not found" }, { status: 404 });
      }

      const meta = item.metadata as { durationMinutes?: number } | null;
      const durationMs = (meta?.durationMinutes ?? 60) * 60 * 1000;

      // If already spotlighted, extend from the existing expiry rather than overwriting it
      const baseTime = challenge.spotlightUntil && challenge.spotlightUntil > new Date()
        ? challenge.spotlightUntil.getTime()
        : Date.now();
      const spotlightUntil = new Date(baseTime + durationMs);

      await prisma.$transaction([
        prisma.puzzleWarzChallenge.update({
          where: { id: targetId },
          data: { spotlightUntil },
        }),
        prisma.userInventory.update({
          where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
          data: { quantity: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({ success: true, spotlightUntil });
    }

    // ── warz_rematch ───────────────────────────────────────────────────
    if (itemKey === "warz_rematch") {
      if (!targetId) return NextResponse.json({ error: "targetId (opponentUserId) required" }, { status: 400 });

      const opponent = await prisma.user.findUnique({ where: { id: targetId }, select: { id: true, name: true } });
      if (!opponent) return NextResponse.json({ error: "Opponent not found" }, { status: 404 });

      // Send a rematch notification to the opponent
      await prisma.$transaction([
        prisma.notification.create({
          data: {
            userId: opponent.id,
            type: "warz_rematch",
            title: "Rematch Challenge",
            message: `${currentUser.name ?? "Someone"} has challenged you to a rematch! Head to Warz to respond.`,
            relatedId: currentUser.id,
          },
        }),
        prisma.userInventory.update({
          where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
          data: { quantity: { decrement: 1 } },
        }),
      ]);

      return NextResponse.json({ success: true, message: `Rematch challenge sent to ${opponent.name}!` });
    }

    return NextResponse.json({ error: "Unknown item action" }, { status: 400 });
  } catch (err) {
    console.error("[STORE USE]", err);
    return NextResponse.json({ error: "Failed to use item" }, { status: 500 });
  }
}
