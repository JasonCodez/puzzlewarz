import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin } from "@/lib/requestSecurity";

/**
 * GET /api/season
 * Returns the current active season, its tiers, and the user's pass progress.
 */
export async function GET(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const now = new Date();

    // Find the active season that's within its date range
    const season = await prisma.season.findFirst({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        tiers: {
          orderBy: { tierNumber: "asc" },
        },
      },
    });

    if (!season) {
      return NextResponse.json({ season: null, userPass: null });
    }

    // Get user pass if logged in
    let userPass = null;
    const session = await getServerSession(authOptions);
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, totalPoints: true },
      });

      if (user) {
        // Upsert: create pass record if first visit
        userPass = await prisma.userSeasonPass.upsert({
          where: {
            userId_seasonId: { userId: user.id, seasonId: season.id },
          },
          create: {
            userId: user.id,
            seasonId: season.id,
          },
          update: {},
        });

        // Attach points balance for UI
        (userPass as any).userPoints = user.totalPoints;
      }
    }

    return NextResponse.json({ season, userPass });
  } catch (error) {
    console.error("[SEASON GET]", error);
    return NextResponse.json(
      { error: "Failed to load season" },
      { status: 500 }
    );
  }
}
