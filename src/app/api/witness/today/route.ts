import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodaysScenario, getTodaysDeadDrop, getTodaysQuestionIndices } from "@/lib/witness-content";

// GET /api/witness/today — return today's scenario (without correct answers) + stats
export async function GET() {
  try {
    const scenario = getTodaysScenario();
    const deadDrop = getTodaysDeadDrop();

    // Aggregate score distribution for this scenario
    const results = await prisma.witnessResult.groupBy({
      by: ["score"],
      where: { scenarioId: scenario.id },
      _count: { score: true },
    });

    const totalPlays = results.reduce((sum, r) => sum + r._count.score, 0);
    // Build scoreDist: index = score (0-5), value = count
    const scoreDist = Array(6).fill(0) as number[];
    for (const r of results) scoreDist[r.score] = r._count.score;

    // Dead drop solve rate
    const ddTotal = await prisma.deadDropResult.count({
      where: { challengeId: deadDrop.id },
    });
    const ddSolved = await prisma.deadDropResult.count({
      where: { challengeId: deadDrop.id, solved: true },
    });

    // Pick today's 5 questions from the pool of 8 (deterministic by day)
    const indices = getTodaysQuestionIndices(scenario, 5);
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
    });
  } catch {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
