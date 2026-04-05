import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

// App Router reads raw body via request.text() — no bodyParser config needed.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[STRIPE WEBHOOK] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const bundleKey = session.metadata?.bundleKey;
    const pointsToGrant = parseInt(session.metadata?.pointsToGrant ?? "0", 10);

    if (!userId || !bundleKey || !pointsToGrant) {
      console.error("[STRIPE WEBHOOK] Missing metadata on session:", session.id);
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Idempotency — skip if already processed
    const existing = await prisma.pointPurchase.findUnique({
      where: { stripeSessionId: session.id },
    });
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await prisma.$transaction([
      prisma.pointPurchase.create({
        data: {
          userId,
          stripeSessionId: session.id,
          bundleKey,
          pointsGranted: pointsToGrant,
          amountPaid: session.amount_total ?? 0,
          currency: session.currency ?? "usd",
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          totalPoints: { increment: pointsToGrant },
          purchasedPoints: { increment: pointsToGrant },
        },
      }),
    ]);

    console.log(`[STRIPE WEBHOOK] Granted ${pointsToGrant} pts to user ${userId} (${bundleKey})`);
  }

  return NextResponse.json({ received: true });
}
