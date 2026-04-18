import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTodaysDebriefScenario, getTodaysDeadDropDebrief, getTodaysDebriefQuestionIndices, DebriefScenario, DeadDropChallenge } from "@/lib/debrief-content";

export const dynamic = 'force-dynamic';

// GET /api/debrief/today — return today's scenario (without correct answers) + stats
// Priority: 1) Scheduled DB puzzle with releaseAt <= now, 2) Hardcoded daily rotation
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id ?? null;

    // Try to load a DB-authored debrief puzzle whose go-live date has passed
    const now = new Date();
    let dbPuzzle = await prisma.puzzle.findFirst({
      where: {
        puzzleType: 'debrief',
        isActive: true,
        schedule: { releaseAt: { lte: now } },
      },
      select: { id: true, data: true },
      orderBy: { schedule: { releaseAt: 'desc' } },
    });
    if (!dbPuzzle) {
      dbPuzzle = await prisma.puzzle.findFirst({
        where: { puzzleType: 'debrief', isActive: true, schedule: null },
        select: { id: true, data: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    let scenario: DebriefScenario;
    let deadDrop: DeadDropChallenge;

    if (dbPuzzle?.data) {
      const d = dbPuzzle.data as any;
      if (d?.debrief?.scenario && d?.debrief?.deadDrop) {
        scenario = d.debrief.scenario as DebriefScenario;
        deadDrop = d.debrief.deadDrop as DeadDropChallenge;
      } else {
        // fallback to hardcoded
        scenario = getTodaysDebriefScenario();
        deadDrop = getTodaysDeadDropDebrief();
      }
    } else {
      scenario = getTodaysDebriefScenario();
      deadDrop = getTodaysDeadDropDebrief();
    }

    // Aggregate score distribution for this scenario
    const results = await prisma.witnessResult.groupBy({
      by: ["score"],
      where: { scenarioId: scenario.id },
      _count: { score: true },
    });

    const totalPlays = results.reduce((sum, r) => sum + r._count.score, 0);
    const scoreDist = Array(6).fill(0) as number[];
    for (const r of results) scoreDist[r.score] = r._count.score;

    // Has the current user already completed today's debrief?
    const completed = userId
      ? !!(await prisma.witnessResult.findFirst({
          where: { scenarioId: scenario.id, userId },
          select: { id: true },
        }))
      : false;

    // Dead drop solve rate
    const ddTotal = await prisma.deadDropResult.count({
      where: { challengeId: deadDrop.id },
    });
    const ddSolved = await prisma.deadDropResult.count({
      where: { challengeId: deadDrop.id, solved: true },
    });

    // Pick today's 5 questions from the pool (deterministic by day)
    const indices = getTodaysDebriefQuestionIndices(scenario, 5);
    const sanitizedQuestions = indices.map((i) => ({
      question: scenario.questions[i].question,
      options: scenario.questions[i].options,
    }));

    return NextResponse.json({
      scenario: {
        id: scenario.id,
        caseNumber: scenario.caseNumber,
        classification: scenario.classification,
        dateTime: scenario.dateTime,
        report: scenario.report,
        questions: sanitizedQuestions,
      },
      deadDrop: {
        id: deadDrop.id,
        metaQuestion: deadDrop.metaQuestion,
        clues: deadDrop.clues.map((c) => ({
          clue: c.clue,
          hint: c.hint,
          // answer is NOT sent to client
        })),
      },
      stats: {
        totalPlays,
        scoreDist,
        ddTotal,
        ddSolved,
        ddSolveRate: ddTotal > 0 ? Math.round((ddSolved / ddTotal) * 100) : 31,
      },
      completed,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
