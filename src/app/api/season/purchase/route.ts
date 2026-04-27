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
 * POST /api/season/purchase
 * Creates a Stripe Checkout session for the $4.99 premium season pass.
 * Returns: { url: string } — redirect to Stripe hosted checkout.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("[SEASON PURCHASE] STRIPE_SECRET_KEY is not set");
      return NextResponse.json({ error: "Payments not configured" }, { status: 500 });
    }

    const now = new Date();

    const season = await prisma.season.findFirst({
      where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
    });

    if (!season) {
      return NextResponse.json({ error: "No active season" }, { status: 400 });
    }

    // Check not already premium
    const existing = await prisma.userSeasonPass.findUnique({
      where: { userId_seasonId: { userId: currentUser.id, seasonId: season.id } },
    });
    if (existing?.isPremium) {
      return NextResponse.json({ error: "You already own the premium pass" }, { status: 400 });
    }

    const stripe = getStripe();

    // Get or create Stripe customer
    const dbUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { email: true, name: true, stripeCustomerId: true },
    });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let customerId = dbUser.stripeCustomerId ?? undefined;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
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
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${season.name} — Premium Pass`,
              description: "Unlock the premium reward track for the full season.",
            },
            unit_amount: 499, // $4.99
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/season-pass?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/season-pass?purchase=cancelled`,
      metadata: {
        type: "season_pass",
        userId: currentUser.id,
        seasonId: season.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("[SEASON PURCHASE]", error);
    return NextResponse.json({ error: "Failed to start checkout" }, { status: 500 });
  }
}
