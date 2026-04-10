import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodaysScenario, getTodaysQuestionIndices } from "@/lib/witness-content";

// POST /api/witness/submit — record a witness attempt and return results
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, answers } = body as { scenarioId: string; answers: number[] };

    if (!scenarioId || !Array.isArray(answers) || answers.length !== 5) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const scenario = getTodaysScenario();
    if (scenario.id !== scenarioId) {
      return NextResponse.json({ error: "Scenario mismatch" }, { status: 400 });
    }

    // Grade against today's selected question indices (same deterministic selection as /today)
    const indices = getTodaysQuestionIndices(scenario, 5);
    const correctAnswers = indices.map((i) => scenario.questions[i].correctIndex);
    let score = 0;
    const breakdown = answers.map((a, i) => {
      // -1 = timed out; never matches a valid correctIndex, so always wrong
      const correct = a === correctAnswers[i];
      if (correct) score++;
      return { correct, correctIndex: correctAnswers[i] };
    });

    // Persist (anonymous, no PII)
    await prisma.witnessResult.create({ data: { scenarioId, score } });

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

    return NextResponse.json({ score, breakdown, scoreDist, totalPlays, percentile });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
