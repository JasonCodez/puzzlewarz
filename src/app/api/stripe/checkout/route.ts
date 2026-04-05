import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-03-25.dahlia",
});

const BUNDLES: Record<string, { priceId: string; points: number; label: string }> = {
  starter_pack: {
    priceId: process.env.STRIPE_PRICE_STARTER!,
    points: 500,
    label: "Starter Pack – 500 Points",
  },
  value_pack: {
    priceId: process.env.STRIPE_PRICE_VALUE!,
    points: 1700,
    label: "Value Pack – 1,700 Points",
  },
  pro_pack: {
    priceId: process.env.STRIPE_PRICE_PRO!,
    points: 4000,
    label: "Pro Pack – 4,000 Points",
  },
  elite_pack: {
    priceId: process.env.STRIPE_PRICE_ELITE!,
    points: 9000,
    label: "Elite Pack – 9,000 Points",
  },
};

/**
 * POST /api/stripe/checkout
 * Body: { bundleKey: string }
 * Returns: { url: string } — Stripe Checkout Session URL
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { bundleKey } = (await request.json()) as { bundleKey?: string };
    if (!bundleKey || !BUNDLES[bundleKey]) {
      return NextResponse.json({ error: "Invalid bundle" }, { status: 400 });
    }

    const bundle = BUNDLES[bundleKey];

    // Retrieve or create Stripe customer so receipts link to their email
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { email: true, name: true, stripeCustomerId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let customerId = dbUser.stripeCustomerId ?? undefined;
    if (customerId) {
      // Verify the customer still exists in the current Stripe mode (live vs test)
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        // Customer doesn't exist in this mode — create a fresh one
        customerId = undefined;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email ?? undefined,
        name: dbUser.name ?? undefined,
        metadata: { userId: currentUser.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: bundle.priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}/store?purchase=success&bundle=${bundleKey}`,
      cancel_url: `${baseUrl}/store?purchase=cancelled`,
      metadata: {
        userId: currentUser.id,
        bundleKey,
        pointsToGrant: String(bundle.points),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const stripeErr = err as { type?: string; code?: string; message?: string };
    console.error("[STRIPE CHECKOUT] type:", stripeErr.type, "| code:", stripeErr.code, "| message:", stripeErr.message);
    console.error("[STRIPE CHECKOUT] STRIPE_SECRET_KEY prefix:", process.env.STRIPE_SECRET_KEY?.slice(0, 10));
    console.error("[STRIPE CHECKOUT] STARTER price:", process.env.STRIPE_PRICE_STARTER);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}
