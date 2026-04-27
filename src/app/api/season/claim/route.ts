import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

async function reconcilePremiumIfPurchased(userId: string, seasonId: string): Promise<boolean> {
  const stripe = getStripe();
  if (!stripe) return false;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });
  if (!dbUser?.stripeCustomerId) return false;

  const sessions = await stripe.checkout.sessions.list({
    customer: dbUser.stripeCustomerId,
    limit: 25,
  });

  const paidSeasonPass = sessions.data.find((s) => {
    const meta = s.metadata ?? {};
    return (
      s.payment_status === "paid" &&
      meta.type === "season_pass" &&
      meta.userId === userId &&
      meta.seasonId === seasonId
    );
  });

  if (!paidSeasonPass) return false;

  await prisma.userSeasonPass.upsert({
    where: { userId_seasonId: { userId, seasonId } },
    create: { userId, seasonId, isPremium: true, purchasedAt: new Date() },
    update: { isPremium: true, purchasedAt: new Date() },
  });

  return true;
}

/**
 * POST /api/season/claim
 * Body: { tierNumber: number, track: "free" | "premium" }
 * Claims a reward from a specific tier on the free or premium track.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { tierNumber, track } = (await request.json()) as {
      tierNumber: number;
      track: "free" | "premium";
    };

    if (!tierNumber || !["free", "premium"].includes(track)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const now = new Date();

    const season = await prisma.season.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
      include: { tiers: true },
    });

    if (!season) {
      return NextResponse.json({ error: "No active season" }, { status: 400 });
    }

    const tier = season.tiers.find((t) => t.tierNumber === tierNumber);
    if (!tier) {
      return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    }

    const userPass = await prisma.userSeasonPass.findUnique({
      where: { userId_seasonId: { userId: currentUser.id, seasonId: season.id } },
    });

    if (!userPass) {
      return NextResponse.json({ error: "No season pass found" }, { status: 400 });
    }

    // Check XP requirement
    if (userPass.seasonXp < tier.xpRequired) {
      return NextResponse.json({ error: "Not enough season XP for this tier" }, { status: 400 });
    }

    // Check premium requirement (with fallback reconciliation in case webhook was delayed)
    let hasPremium = userPass.isPremium;
    if (track === "premium" && !hasPremium) {
      try {
        hasPremium = await reconcilePremiumIfPurchased(currentUser.id, season.id);
      } catch (reconcileError) {
        console.error("[SEASON CLAIM] premium reconcile failed", reconcileError);
      }
    }
    if (track === "premium" && !hasPremium) {
      return NextResponse.json({ error: "Premium pass required" }, { status: 400 });
    }

    // Check already claimed
    const claimed = track === "free" ? userPass.claimedFree : userPass.claimedPrem;
    if (claimed.includes(tierNumber)) {
      return NextResponse.json({ error: "Already claimed" }, { status: 400 });
    }

    // Determine reward
    const rewardType = track === "free" ? tier.freeRewardType : tier.premRewardType;
    const rewardKey = track === "free" ? tier.freeRewardKey : tier.premRewardKey;
    const rewardQty = track === "free" ? tier.freeRewardQty : tier.premRewardQty;

    if (!rewardType) {
      return NextResponse.json({ error: "No reward at this tier for this track" }, { status: 400 });
    }

    // Grant the reward
    const updates: any[] = [];

    switch (rewardType) {
      case "hint_tokens":
        updates.push(
          prisma.user.update({
            where: { id: currentUser.id },
            data: { hintTokens: { increment: rewardQty } },
          })
        );
        break;
      case "points":
        updates.push(
          prisma.user.update({
            where: { id: currentUser.id },
            data: { totalPoints: { increment: rewardQty } },
          })
        );
        break;
      case "skip_tokens":
        updates.push(
          prisma.user.update({
            where: { id: currentUser.id },
            data: { skipTokens: { increment: rewardQty } },
          })
        );
        break;
      case "streak_shields":
        updates.push(
          prisma.user.update({
            where: { id: currentUser.id },
            data: { streakShields: { increment: rewardQty } },
          })
        );
        break;
      case "cosmetic":
        if (rewardKey) {
          // Find the store item and add to inventory
          const item = await prisma.storeItem.findUnique({ where: { key: rewardKey } });
          if (item) {
            updates.push(
              prisma.userInventory.upsert({
                where: { userId_itemId: { userId: currentUser.id, itemId: item.id } },
                create: { userId: currentUser.id, itemId: item.id, quantity: 1 },
                update: { quantity: { increment: 1 } },
              })
            );
          }
        }
        break;
    }

    // Update claimed tiers
    const newClaimed = [...claimed, tierNumber];
    const claimField = track === "free" ? "claimedFree" : "claimedPrem";

    updates.push(
      prisma.userSeasonPass.update({
        where: { userId_seasonId: { userId: currentUser.id, seasonId: season.id } },
        data: { [claimField]: newClaimed },
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({
      success: true,
      reward: { type: rewardType, key: rewardKey, qty: rewardQty },
    });
  } catch (error) {
    console.error("[SEASON CLAIM]", error);
    return NextResponse.json({ error: "Failed to claim reward" }, { status: 500 });
  }
}
