import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireEscapeRoomTeamContext } from "@/lib/escapeRoomTeamAuth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const puzzleId = resolved.id;

    const body = await request.json().catch(() => ({}));
    const { stageIndex, answer, teamId } = body as { stageIndex?: number; answer?: string; teamId?: string };

    const ctx = await requireEscapeRoomTeamContext(request, puzzleId, { teamId });
    if (ctx instanceof NextResponse) return ctx;

    if (typeof stageIndex !== 'number') {
      return NextResponse.json({ error: 'stageIndex is required' }, { status: 400 });
    }

    // Load the stage for the given escape room/puzzle
    const stage = await prisma.escapeStage.findFirst({ where: { escapeRoomId: ctx.escapeRoomId, order: stageIndex } });

    if (!stage) return NextResponse.json({ error: 'Stage not found' }, { status: 404 });

    // Simple answer validation: compare sanitized strings if stage has correctAnswer
    if (stage.correctAnswer && typeof answer === 'string') {
      const ok = stage.correctAnswer.trim().toLowerCase() === answer.trim().toLowerCase();
      if (ok) {
        // Persist solved stage to team progress (best-effort)
        try {
          const progress = await (prisma as any).teamEscapeProgress.findUnique({
            where: { teamId_escapeRoomId: { teamId: ctx.teamId, escapeRoomId: ctx.escapeRoomId } },
            select: { solvedStages: true, currentStageIndex: true },
          });

          let solvedStages: number[] = [];
          try {
            solvedStages = progress?.solvedStages ? JSON.parse(progress.solvedStages) : [];
            if (!Array.isArray(solvedStages)) solvedStages = [];
          } catch {
            solvedStages = [];
          }

          if (!solvedStages.includes(stage.order)) solvedStages.push(stage.order);
          solvedStages.sort((a, b) => a - b);

          await (prisma as any).teamEscapeProgress.update({
            where: { teamId_escapeRoomId: { teamId: ctx.teamId, escapeRoomId: ctx.escapeRoomId } },
            data: {
              solvedStages: JSON.stringify(solvedStages),
              currentStageIndex: Math.max(progress?.currentStageIndex ?? 0, stage.order),
            },
          });
        } catch (e) {
          // ignore progress write failures
        }

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
