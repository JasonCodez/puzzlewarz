import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { puzzleId, rating, review } = await req.json();

    if (!puzzleId || !rating) {
      return NextResponse.json(
        { error: "Missing required fields: puzzleId, rating" },
        { status: 400 }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    // Verify puzzle exists
    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true },
    });

    if (!puzzle) {
      return NextResponse.json(
        { error: "Puzzle not found" },
        { status: 404 }
      );
    }

    // Check if user has already rated this puzzle
    const existingRating = await prisma.puzzleRating.findUnique({
      where: {
        puzzleId_userId: {
          puzzleId,
          userId: user.id,
        },
      },
    });

    let puzzleRating;
    let pointsAwarded = 0;
    if (!existingRating) {
      // First time rating: create and award points
      puzzleRating = await prisma.puzzleRating.create({
        data: {
          puzzleId,
          userId: user.id,
          rating,
          review: review || null,
        },
      });
      // Award 5 points in GlobalLeaderboard
      // `userId` is not a unique field in the schema, so we can't upsert by it.
      // Find existing leaderboard entry and update, otherwise create one.
      const existingLeaderboard = await prisma.globalLeaderboard.findFirst({ where: { userId: user.id } });
      if (existingLeaderboard) {
        await prisma.globalLeaderboard.update({
          where: { id: existingLeaderboard.id },
          data: { totalPoints: { increment: 5 } },
        });
      } else {
        await prisma.globalLeaderboard.create({ data: { userId: user.id, totalPoints: 5 } });
      }
      pointsAwarded = 5;

      // Also increment or create the user's UserPuzzleProgress so profile totals reflect awarded points
      try {
        const existingProgress = await prisma.userPuzzleProgress.findUnique({
          where: {
            userId_puzzleId: {
              userId: user.id,
              puzzleId,
            },
          },
        });

        if (existingProgress) {
          await prisma.userPuzzleProgress.update({
            where: { id: existingProgress.id },
            data: { pointsEarned: { increment: 5 } },
          });
        } else {
          await prisma.userPuzzleProgress.create({
            data: {
              userId: user.id,
              puzzleId,
              pointsEarned: 5,
            },
          });
        }
      } catch (err) {
        console.error('Failed to update UserPuzzleProgress for rating award:', err);
      }
    } else {
      // Update existing rating, no points
      puzzleRating = await prisma.puzzleRating.update({
        where: {
          puzzleId_userId: {
            puzzleId,
            userId: user.id,
          },
        },
        data: {
          rating,
          review: review || null,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      rating: puzzleRating,
      pointsAwarded,
    });
  } catch (error) {
    console.error("Error submitting puzzle rating:", error);
    return NextResponse.json(
      { error: "Failed to submit rating" },
      { status: 500 }
    );
  }
}

// GET user's rating for a specific puzzle
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const searchParams = req.nextUrl.searchParams;
    const puzzleId = searchParams.get("puzzleId");

    if (!puzzleId) {
      return NextResponse.json(
        { error: "puzzleId is required" },
        { status: 400 }
      );
    }

    const rating = await prisma.puzzleRating.findUnique({
      where: {
        puzzleId_userId: {
          puzzleId,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({
      rating: rating || null,
    });
  } catch (error) {
    console.error("Error fetching puzzle rating:", error);
    return NextResponse.json(
      { error: "Failed to fetch rating" },
      { status: 500 }
    );
  }
}
