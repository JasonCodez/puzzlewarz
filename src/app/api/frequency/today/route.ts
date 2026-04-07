import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/frequency/today
// Returns today's question + whether the current user/session has already submitted
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? null;

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const question = await prisma.frequencyQuestion.findFirst({
    where: { scheduledFor: today },
    select: { id: true, question: true, status: true, scheduledFor: true },
  });

  if (!question) {
    return NextResponse.json({ question: null });
  }

  // Check if already submitted
  let alreadySubmitted = false;
  let existingSubmission = null;

  if (userId) {
    existingSubmission = await prisma.frequencySubmission.findUnique({
      where: { questionId_userId: { questionId: question.id, userId } },
      select: { answers: true, score: true },
    });
    alreadySubmitted = !!existingSubmission;
  } else if (sessionId) {
    existingSubmission = await prisma.frequencySubmission.findFirst({
      where: { questionId: question.id, sessionId, userId: null },
      select: { answers: true, score: true },
    });
    alreadySubmitted = !!existingSubmission;
  }

  // If revealed or already submitted, also return results
  let results = null;
  if (question.status === "revealed" || alreadySubmitted) {
    const answers = await prisma.frequencyAnswer.findMany({
      where: { questionId: question.id },
      orderBy: { count: "desc" },
      select: { id: true, displayText: true, text: true, count: true },
    });
    const totalSubmissions = await prisma.frequencySubmission.count({
      where: { questionId: question.id },
    });
    results = { answers, totalSubmissions };
  }

  return NextResponse.json({
    question,
    alreadySubmitted,
    submission: existingSubmission,
    results,
  });
}
