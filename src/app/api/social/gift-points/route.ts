import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

const MIN_GIFT = 10;
const MAX_GIFT = 5000;

/**
 * POST /api/social/gift-points
 * Body: { toUsername: string, amount: number }
 *
 * Transfers points from the authenticated user to the recipient.
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { toUsername, amount } = (await request.json()) as { toUsername: string; amount: number };

    if (!toUsername || typeof toUsername !== "string") {
      return NextResponse.json({ error: "toUsername is required" }, { status: 400 });
    }
    if (!Number.isInteger(amount) || amount < MIN_GIFT || amount > MAX_GIFT) {
      return NextResponse.json(
        { error: `Amount must be a whole number between ${MIN_GIFT} and ${MAX_GIFT}.` },
        { status: 400 }
      );
    }

    // Fetch sender with balance
    const sender = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { id: true, name: true, totalPoints: true },
    });
    if (!sender) return NextResponse.json({ error: "Sender not found" }, { status: 404 });

    if (sender.totalPoints < amount) {
      return NextResponse.json({ error: "Insufficient points balance." }, { status: 400 });
    }

    // Find recipient by username (case-insensitive)
    const recipient = await prisma.user.findFirst({
      where: { name: { equals: toUsername, mode: "insensitive" } },
      select: { id: true, name: true },
    });
    if (!recipient) {
      return NextResponse.json({ error: `User "${toUsername}" not found.` }, { status: 404 });
    }
    if (recipient.id === sender.id) {
      return NextResponse.json({ error: "You cannot gift points to yourself." }, { status: 400 });
    }

    // Transfer in a transaction
    await prisma.$transaction([
      // Deduct from sender
      prisma.user.update({
        where: { id: sender.id },
        data: { totalPoints: { decrement: amount } },
      }),
      // Credit recipient
      prisma.user.update({
        where: { id: recipient.id },
        data: { totalPoints: { increment: amount } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      gifted: amount,
      to: recipient.name,
    });
  } catch (err) {
    console.error("[GIFT POINTS]", err);
    return NextResponse.json({ error: "Failed to send gift" }, { status: 500 });
  }
}
