import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const puzzleId = searchParams.get("puzzleId");
    const puzzleIds = searchParams.get("puzzleIds"); // comma-separated bulk mode

    // ── Bulk mode: ?puzzleIds=id1,id2,... ─────────────────────────────────
    if (puzzleIds) {
      const ids = puzzleIds.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) return NextResponse.json({});

      const allRatings = await prisma.puzzleRating.findMany({
        where: { puzzleId: { in: ids } },
        select: { puzzleId: true, rating: true },
      });

      const grouped: Record<string, number[]> = {};
      for (const r of allRatings) {
        if (!grouped[r.puzzleId]) grouped[r.puzzleId] = [];
        grouped[r.puzzleId].push(r.rating);
      }

      const result: Record<string, { averageRating: number; ratingCount: number }> = {};
      for (const id of ids) {
        const list = grouped[id] ?? [];
        result[id] = {
          averageRating: list.length > 0 ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 100) / 100 : 0,
          ratingCount: list.length,
        };
      }
      return NextResponse.json(result);
    }

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      );
    }

    // Get all ratings for this puzzle
    const ratings = await prisma.puzzleRating.findMany({
      where: { puzzleId },
      select: { rating: true },
    });

    if (ratings.length === 0) {
      return NextResponse.json({
        puzzleId,
        averageRating: 0,
        ratingCount: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
        },
      });
    }

    // Calculate average
    const sum = ratings.reduce((acc: number, r: { rating: number }) => acc + r.rating, 0);
    const average = sum / ratings.length;

    // Calculate distribution
    const distribution = {
      1: ratings.filter((r: { rating: number }) => r.rating === 1).length,
      2: ratings.filter((r: { rating: number }) => r.rating === 2).length,
      3: ratings.filter((r: { rating: number }) => r.rating === 3).length,
      4: ratings.filter((r: { rating: number }) => r.rating === 4).length,
      5: ratings.filter((r: { rating: number }) => r.rating === 5).length,
    };

    return NextResponse.json({
      puzzleId,
      averageRating: Math.round(average * 100) / 100, // Round to 2 decimals
      ratingCount: ratings.length,
      ratingDistribution: distribution,
    });
  } catch (error) {
    console.error("Error fetching puzzle rating stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating stats" },
      { status: 500 }
    );
  }
}
