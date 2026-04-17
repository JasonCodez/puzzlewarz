import prisma from "@/lib/prisma";

export async function startSession(
  progressId: string,
  userId: string,
  puzzleId: string,
): Promise<void> {
  await prisma.userPuzzleProgress.update({
    where: { id: progressId },
    data: { currentSessionStart: new Date() },
  });

  await prisma.puzzleSessionLog.create({
    data: {
      progressId,
      userId,
      puzzleId,
      sessionStart: new Date(),
    },
  });
}

export async function endSession(
  progress: { id: string; currentSessionStart: Date | null; totalTimeSpent: number },
  durationSeconds: number | undefined,
  hintUsed: boolean | undefined,
): Promise<void> {
  if (!progress.currentSessionStart) return;

  const now = new Date();
  const computedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - progress.currentSessionStart.getTime()) / 1000),
  );
  const finalDuration = typeof durationSeconds === "number" ? durationSeconds : computedSeconds;

  await prisma.userPuzzleProgress.update({
    where: { id: progress.id },
    data: {
      totalTimeSpent: progress.totalTimeSpent + finalDuration,
      currentSessionStart: null,
    },
  });

  const sessionLog = await prisma.puzzleSessionLog.findFirst({
    where: { progressId: progress.id, sessionEnd: null },
    orderBy: { sessionStart: "desc" },
  });

  if (sessionLog) {
    await prisma.puzzleSessionLog.update({
      where: { id: sessionLog.id },
      data: {
        sessionEnd: now,
        durationSeconds: finalDuration,
        hintUsed: hintUsed ?? false,
      },
    });
  }
}
