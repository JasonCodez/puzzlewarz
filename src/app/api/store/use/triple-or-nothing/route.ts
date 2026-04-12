import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * POST /api/store/use/triple-or-nothing
 * Activates or deactivates the Triple-or-Nothing token.
 * - Activating consumes one token from inventory and sets tripleOrNothingActive = true.
 * - Deactivating sets tripleOrNothingActive = false (token already consumed, no refund).
 *
 * Body: { activate: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { activate } = (await request.json()) as { activate: boolean };

    if (activate === false) {
      // Deactivate only — does NOT refund the token
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { tripleOrNothingActive: false },
      });
      return NextResponse.json({ success: true, active: false });
    }

    // Activating: check if token is already active
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { tripleOrNothingTokens: true, tripleOrNothingActive: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    if (user.tripleOrNothingActive) {
      return NextResponse.json({ error: "Triple-or-Nothing is already active." }, { status: 400 });
    }
    if (user.tripleOrNothingTokens < 1) {
      return NextResponse.json({ error: "No Triple-or-Nothing tokens. Purchase one in the Store." }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        tripleOrNothingTokens: { decrement: 1 },
        tripleOrNothingActive: true,
      },
    });

    return NextResponse.json({ success: true, active: true });
  } catch (err) {
    console.error("[TRIPLE OR NOTHING]", err);
    return NextResponse.json({ error: "Failed to update token" }, { status: 500 });
  }
}
