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
 * POST /api/stripe/verify-purchase
 * Body: { sessionId: string }
 *
 * Idempotent fallback for crediting points when the webhook fires late or not at all.
 * Called client-side after the Stripe success redirect.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { sessionId } = (await request.json()) as { sessionId?: string };
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    // Idempotency — if already processed by webhook, return success immediately
    const existing = await prisma.pointPurchase.findUnique({
      where: { stripeSessionId: sessionId },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyGranted: true, pointsGranted: existing.pointsGranted });
    }

    // Retrieve session from Stripe to verify payment status
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    // Verify this session belongs to the authenticated user
    const metaUserId = session.metadata?.userId;
    if (!metaUserId || metaUserId !== currentUser.id) {
      return NextResponse.json({ error: "Session does not belong to this user" }, { status: 403 });
    }

    const bundleKey = session.metadata?.bundleKey;
    const pointsToGrant = parseInt(session.metadata?.pointsToGrant ?? "0", 10);

    if (!bundleKey || !pointsToGrant) {
      return NextResponse.json({ error: "Session metadata incomplete" }, { status: 400 });
    }

    // Credit points — idempotent transaction
    await prisma.$transaction([
      prisma.pointPurchase.create({
        data: {
          userId: currentUser.id,
          stripeSessionId: sessionId,
          bundleKey,
          pointsGranted: pointsToGrant,
          amountPaid: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
        },
      }),
      prisma.user.update({
        where: { id: currentUser.id },
        data: {
          totalPoints: { increment: pointsToGrant },
          purchasedPoints: { increment: pointsToGrant },
        },
      }),
    ]);

    console.log(`[VERIFY PURCHASE] Granted ${pointsToGrant} pts to user ${currentUser.id} (${bundleKey}) via fallback`);
    return NextResponse.json({ success: true, alreadyGranted: false, pointsGranted: pointsToGrant });
  } catch (err) {
    console.error("[VERIFY PURCHASE]", err);
    return NextResponse.json({ error: "Failed to verify purchase" }, { status: 500 });
  }
}
