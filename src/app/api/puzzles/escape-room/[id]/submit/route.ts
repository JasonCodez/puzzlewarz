import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const puzzleId = resolved.id;

    const body = await request.json().catch(() => ({}));
    const { stageIndex, answer } = body as { stageIndex?: number; answer?: string };

    if (typeof stageIndex !== 'number') {
      return NextResponse.json({ error: 'stageIndex is required' }, { status: 400 });
    }

    // Load the stage for the given escape room/puzzle
    const stage = await prisma.escapeStage.findFirst({ where: { escapeRoomId: (await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId }, select: { id: true } }))?.id, order: stageIndex } });

    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 });

    // Simple answer validation: compare sanitized strings if stage has correctAnswer
    if (stage.correctAnswer && typeof answer === 'string') {
      const ok = stage.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
      if (ok) {
        // Return next stage index (best-effort)
        const next = stage.order + 1;
        return NextResponse.json({ correct: true, message: 'Correct', nextStageIndex: next });
      }
      return NextResponse.json({ correct: false, message: 'Incorrect' });
    }

    return NextResponse.json({ error: 'No answer expected for this stage' }, { status: 400 });
  } catch (e) {
    console.error('Error submitting escape stage answer:', e);
    return NextResponse.json({ error: 'Failed to submit answer' }, { status: 500 });
  }
}
