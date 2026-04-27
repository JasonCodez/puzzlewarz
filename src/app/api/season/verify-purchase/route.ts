import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
}

/**
 * POST /api/season/verify-purchase
 * Body: { sessionId?: string }
 *
 * Idempotent fallback for granting season premium when webhook is delayed
 * or unavailable. If sessionId is omitted, we attempt to find the user's
 * most recent paid season-pass checkout for the active season.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";

    const stripe = getStripe();
    let checkoutSession: Stripe.Checkout.Session | null = null;

    if (sessionId) {
      checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    } else {
      const now = new Date();
      const activeSeason = await prisma.season.findFirst({
        where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
        select: { id: true },
      });
      if (!activeSeason) {
        return NextResponse.json({ error: "No active season" }, { status: 400 });
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { stripeCustomerId: true },
      });
      if (!dbUser?.stripeCustomerId) {
        return NextResponse.json({ error: "No Stripe customer found for this user" }, { status: 400 });
      }

      const sessions = await stripe.checkout.sessions.list({
        customer: dbUser.stripeCustomerId,
        limit: 25,
      });

      checkoutSession =
        sessions.data.find((s) => {
          const meta = s.metadata ?? {};
          return (
            s.payment_status === "paid" &&
            meta.type === "season_pass" &&
            meta.userId === currentUser.id &&
            meta.seasonId === activeSeason.id
          );
        }) ?? null;

      if (!checkoutSession) {
        return NextResponse.json({ error: "No paid season-pass checkout found" }, { status: 404 });
      }
    }

    if (checkoutSession.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    const metaType = checkoutSession.metadata?.type;
    if (metaType !== "season_pass") {
      return NextResponse.json({ error: "Checkout session is not a season-pass purchase" }, { status: 400 });
    }

    const metaUserId = checkoutSession.metadata?.userId;
    const seasonId = checkoutSession.metadata?.seasonId;

    if (!metaUserId || !seasonId) {
      return NextResponse.json({ error: "Session metadata incomplete" }, { status: 400 });
    }

    if (metaUserId !== currentUser.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
    }

    const existing = await prisma.userSeasonPass.findUnique({
      where: { userId_seasonId: { userId: currentUser.id, seasonId } },
      select: { isPremium: true, purchasedAt: true },
    });

    if (existing?.isPremium && existing.purchasedAt) {
      return NextResponse.json({ success: true, alreadyGranted: true, seasonId });
    }

    await prisma.userSeasonPass.upsert({
      where: { userId_seasonId: { userId: currentUser.id, seasonId } },
      create: { userId: currentUser.id, seasonId, isPremium: true, purchasedAt: new Date() },
      update: { isPremium: true, purchasedAt: new Date() },
    });

    return NextResponse.json({ success: true, alreadyGranted: false, seasonId });
  } catch (error) {
    console.error("[SEASON VERIFY PURCHASE]", error);
    return NextResponse.json({ error: "Failed to verify premium purchase" }, { status: 500 });
  }
}
