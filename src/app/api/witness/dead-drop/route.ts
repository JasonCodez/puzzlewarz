import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getTodaysDeadDrop } from "@/lib/witness-content";

// POST /api/witness/dead-drop — validate a dead drop answer
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { challengeId, clueAnswers } = body as {
      challengeId: string;
      clueAnswers: string[]; // array of 3 answers from the client
    };

    if (!challengeId || !Array.isArray(clueAnswers) || clueAnswers.length !== 3) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const challenge = getTodaysDeadDrop();
    if (challenge.id !== challengeId) {
      return NextResponse.json({ error: "Challenge mismatch" }, { status: 400 });
    }

    const clueResults = clueAnswers.map((ans, i) => ({
      correct: ans.trim().toLowerCase() === challenge.clues[i].answer,
      displayAnswer: challenge.clues[i].displayAnswer,
    }));

    const allCorrect = clueResults.every((r) => r.correct);

    // Record anonymously
    await prisma.deadDropResult.create({
      data: { challengeId, solved: allCorrect },
    });

    // Solve rate after recording
    const [total, solved] = await Promise.all([
      prisma.deadDropResult.count({ where: { challengeId } }),
      prisma.deadDropResult.count({ where: { challengeId, solved: true } }),
    ]);

    return NextResponse.json({
      clueResults,
      finalAnswer: allCorrect ? challenge.finalDisplay : null,
      solved: allCorrect,
      solveRate: total > 0 ? Math.round((solved / total) * 100) : 0,
      total,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
