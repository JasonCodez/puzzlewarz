import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";

// Day 1 = 2026-03-31 (must match daily/word/route.ts)
const START_DATE = Date.UTC(2026, 2, 31);

function getTodayDayNumber(): number {
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((todayUtc - START_DATE) / 86_400_000) + 1;
}

/**
 * POST /api/daily/complete
 * Records that the current user completed today's daily word puzzle.
 * Auto-consumes a streak shield if the streak was broken (gap of exactly 1 day).
 *
 * Body: { won: boolean, guesses: number }
 */
export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const body = await request.json();
    const { won, guesses } = body as { won: boolean; guesses: number };

    if (typeof won !== "boolean" || typeof guesses !== "number") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const dayNumber = getTodayDayNumber();

    // Check if already recorded today
    const existing = await prisma.dailyWordRecord.findUnique({
      where: { userId_dayNumber: { userId: currentUser.id, dayNumber } },
    });
    if (existing) {
      return NextResponse.json({ message: "Already recorded", shieldUsed: existing.shieldUsed });
    }

    // Check streak: look at most recent record before today
    const lastRecord = await prisma.dailyWordRecord.findFirst({
      where: { userId: currentUser.id, dayNumber: { lt: dayNumber } },
      orderBy: { dayNumber: "desc" },
    });

    let shieldUsed = false;
    if (lastRecord) {
      const gap = dayNumber - lastRecord.dayNumber;
      // gap === 1 → consecutive (no shield needed)
      // gap === 2 → missed exactly 1 day → use a shield if available
      if (gap === 2) {
        const user = await prisma.user.findUnique({
          where: { id: currentUser.id },
          select: { streakShields: true },
        });
        if (user && user.streakShields > 0) {
          // Consume one shield and insert a synthetic "skipped" record for the gap day
          const gapDay = lastRecord.dayNumber + 1;
          await prisma.$transaction([
            prisma.user.update({
              where: { id: currentUser.id },
              data: { streakShields: { decrement: 1 } },
            }),
            prisma.dailyWordRecord.create({
              data: {
                userId: currentUser.id,
                dayNumber: gapDay,
                won: false,
                guesses: 0,
                skipped: true,
                shieldUsed: true,
              },
            }),
          ]);
          shieldUsed = true;
        }
      }
    }

    // Record today's completion
    await prisma.dailyWordRecord.create({
      data: {
        userId: currentUser.id,
        dayNumber,
        won,
        guesses,
        shieldUsed: false,
      },
    });

    return NextResponse.json({ success: true, shieldUsed });
  } catch (err) {
    console.error("[DAILY COMPLETE]", err);
    return NextResponse.json({ error: "Failed to record completion" }, { status: 500 });
  }
}

/**
 * GET /api/daily/complete
 * Returns whether the user has already completed today's puzzle + their daily streak.
 */
export async function GET(request: NextRequest) {
  try {
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const dayNumber = getTodayDayNumber();

    const todayRecord = await prisma.dailyWordRecord.findUnique({
      where: { userId_dayNumber: { userId: currentUser.id, dayNumber } },
    });

    // Compute streak
    const records = await prisma.dailyWordRecord.findMany({
      where: { userId: currentUser.id },
      orderBy: { dayNumber: "desc" },
    });

    let streak = 0;
    let expected = dayNumber;
    for (const rec of records) {
      if (rec.dayNumber === expected || rec.dayNumber === expected - 1) {
        // Allow today's puzzle not yet done
        if (rec.dayNumber === expected - 1 && streak === 0 && !todayRecord) {
          // yesterday was the last one — streak still alive until end of today
        }
        if (rec.dayNumber === expected || (rec.dayNumber === expected - 1 && streak > 0)) {
          streak++;
          expected = rec.dayNumber - 1;
        } else if (rec.dayNumber === expected - 1 && streak === 0) {
          streak = 1;
          expected = rec.dayNumber - 1;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Simpler streak calculation
    streak = 0;
    let prevDay = todayRecord ? dayNumber : dayNumber - 1;
    for (const rec of records) {
      if (rec.dayNumber === prevDay) {
        streak++;
        prevDay--;
      } else if (rec.dayNumber < prevDay) {
        break;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
      select: { streakShields: true, skipTokens: true },
    });

    return NextResponse.json({
      completedToday: !!todayRecord,
      todayRecord,
      streak,
      streakShields: user?.streakShields ?? 0,
      skipTokens: user?.skipTokens ?? 0,
    });
  } catch (err) {
    console.error("[DAILY GET]", err);
    return NextResponse.json({ error: "Failed to get daily status" }, { status: 500 });
  }
}
