import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validateSameOrigin } from "@/lib/requestSecurity";

import { calcLevel } from "@/lib/levels";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        xp: true,
        level: true,
        xpTitle: true,
        activeTheme: true,
        activeFrame: true,
        activeSkin: true,
        activeFlair: true,
        activeNameColor: true,
        activeTitle: true,
        isFounder: true,
        totalPoints: true,
        purchasedPoints: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Earned points = total - purchased (consistent with leaderboard)
    const earnedPoints = (user.totalPoints ?? 0) - (user.purchasedPoints ?? 0);
    // Solve count must come from solved puzzle records so spending points never lowers it.
    const solvedCount = await prisma.userPuzzleProgress.count({
      where: { userId: user.id, solved: true },
    });

    // Get user's global rank (based on earned points, excluding purchased)
    const allUsers = await prisma.user.findMany({
      where: { isHidden: false, role: { not: "admin" } },
      select: { id: true, totalPoints: true, purchasedPoints: true },
    });
    const sorted = allUsers
      .map(u => ({ userId: u.id, earned: (u.totalPoints ?? 0) - (u.purchasedPoints ?? 0) }))
      .sort((a, b) => b.earned - a.earned);
    const userRank = sorted.findIndex(u => u.userId === user.id) + 1;

    let level = user.level ?? 1;
    let xpTitle = user.xpTitle ?? "Newcomer";
    let xpProgress = 0;
    let xpToNextLevel = 100;
    try {
      const lvl = calcLevel(user.xp ?? 0);
      level = lvl.level;
      xpTitle = lvl.title;
      xpProgress = lvl.progress;
      xpToNextLevel = lvl.nextLevelXp - lvl.currentXp;
    } catch (xpErr) {
      console.error("XP calc error:", xpErr);
    }

    return NextResponse.json({
      ...user,
      level,
      xpTitle,
      totalPuzzlesSolved: solvedCount,
      totalPoints: earnedPoints,
      rank: userRank > 0 ? userRank : null,
      xpProgress,
      xpToNextLevel,
    });
  } catch (error) {
    console.error("Profile GET error:", error instanceof Error ? error.message : String(error), error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }

    // Validate display name against profanity + reserved words
    const { isAllowedDisplayName } = await import("@/lib/display-name-validator");
    const nameCheck = isAllowedDisplayName(name.trim());
    if (!nameCheck.ok) {
      return NextResponse.json({ error: nameCheck.reason }, { status: 400 });
    }

    // Check if display name is already taken by another user (case-insensitive)
    const nameTaken = await prisma.user.findFirst({
      where: {
        name: { equals: name.trim(), mode: "insensitive" },
        NOT: { email: session.user.email },
      },
    });
    if (nameTaken) {
      return NextResponse.json({ error: "Display name is already taken" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        xp: true,
        level: true,
        xpTitle: true,
      },
    });

    // Get updated stats
    const freshUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { totalPoints: true, purchasedPoints: true },
    });
    const earnedPoints = ((freshUser?.totalPoints ?? 0) - (freshUser?.purchasedPoints ?? 0));
    const solvedCount = await prisma.userPuzzleProgress.count({
      where: { userId: user.id, solved: true },
    });

    // Get updated rank
    const allUsers = await prisma.user.findMany({
      where: { isHidden: false, role: { not: "admin" } },
      select: { id: true, totalPoints: true, purchasedPoints: true },
    });
    const sorted = allUsers
      .map(u => ({ userId: u.id, earned: (u.totalPoints ?? 0) - (u.purchasedPoints ?? 0) }))
      .sort((a, b) => b.earned - a.earned);
    const userRank = sorted.findIndex(u => u.userId === user.id) + 1;

    return NextResponse.json({
      ...user,
      totalPuzzlesSolved: solvedCount,
      totalPoints: earnedPoints,
      rank: userRank > 0 ? userRank : null,
      xpProgress: calcLevel(user.xp ?? 0),
    });
  } catch (error) {
    console.error("Profile PUT error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
