import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getTodaysDebriefScenario, getTodaysDebriefQuestionIndices, DebriefScenario } from "@/lib/debrief-content";

// POST /api/debrief/submit — record a debrief attempt and return results
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, answers } = body as { scenarioId: string; answers: number[] };

    if (!scenarioId || !Array.isArray(answers) || answers.length !== 5) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Resolve scenario — try DB-authored first, then hardcoded
    let scenario: DebriefScenario;
    const now = new Date();
    const dbPuzzle = await prisma.puzzle.findFirst({
      where: {
        puzzleType: 'debrief',
        isActive: true,
        schedule: { releaseAt: { lte: now } },
      },
      select: { data: true },
      orderBy: { schedule: { releaseAt: 'desc' } },
    }) ?? await prisma.puzzle.findFirst({
      where: { puzzleType: 'debrief', isActive: true, schedule: null },
      select: { data: true },
      orderBy: { createdAt: 'desc' },
    });

    if (dbPuzzle?.data) {
      const d = dbPuzzle.data as any;
      if (d?.debrief?.scenario) {
        scenario = d.debrief.scenario as DebriefScenario;
      } else {
        scenario = getTodaysDebriefScenario();
      }
    } else {
      scenario = getTodaysDebriefScenario();
    }

    if (scenario.id !== scenarioId) {
      return NextResponse.json({ error: "Scenario mismatch" }, { status: 400 });
    }

    // Grade against today's selected question indices (same deterministic selection as /today)
    const indices = getTodaysDebriefQuestionIndices(scenario, 5);
    const correctAnswers = indices.map((i) => scenario.questions[i].correctIndex);
    let score = 0;
    const breakdown = answers.map((a, i) => {
      // -1 = timed out; never matches a valid correctIndex, so always wrong
      const correct = a === correctAnswers[i];
      if (correct) score++;
      return { correct, correctIndex: correctAnswers[i] };
    });

    const pointsAwarded = score * 20;
    const xpAwarded = score * 10;

    // Optional auth: anonymous users can play, logged-in users can earn rewards once per scenario.
    const session = await getServerSession(authOptions);
    let userId: string | null = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = user?.id ?? null;
    }

    let rewardsGranted = false;
    if (userId) {
      const alreadyRewarded = await prisma.witnessResult.findFirst({
        where: { scenarioId, userId },
        select: { id: true },
      });

      if (!alreadyRewarded) {
        await prisma.$transaction([
          prisma.witnessResult.create({ data: { scenarioId, score, userId } }),
          prisma.user.update({
            where: { id: userId },
            data: {
              totalPoints: { increment: pointsAwarded },
              xp: { increment: xpAwarded },
            },
          }),
        ]);
        rewardsGranted = true;
      } else {
        // Still record the attempt for analytics, but do not re-award points/xp.
        await prisma.witnessResult.create({ data: { scenarioId, score, userId } });
      }
    } else {
      // Persist anonymous attempt.
      await prisma.witnessResult.create({ data: { scenarioId, score } });
    }

    // Re-query aggregate after recording
    const results = await prisma.witnessResult.groupBy({
      by: ["score"],
      where: { scenarioId },
      _count: { score: true },
    });
    const totalPlays = results.reduce((sum, r) => sum + r._count.score, 0);
    const scoreDist = Array(6).fill(0) as number[];
    for (const r of results) scoreDist[r.score] = r._count.score;

    // How many players scored strictly less than this player?
    const beatCount = scoreDist.slice(0, score).reduce((s, c) => s + c, 0);
    const percentile = totalPlays > 1
      ? Math.round((beatCount / (totalPlays - 1)) * 100)
      : 100;

    return NextResponse.json({
      score,
      breakdown,
      scoreDist,
      totalPlays,
      percentile,
      rewards: {
        points: pointsAwarded,
        xp: xpAwarded,
        granted: rewardsGranted,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
