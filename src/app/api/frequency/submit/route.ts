import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

function normalizeAnswer(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
}

// POST /api/frequency/submit
// Body: { questionId, answers: string[], sessionId?: string }
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? null;

  const body = await request.json();
  const { questionId, answers, sessionId } = body as {
    questionId: string;
    answers: string[];
    sessionId?: string;
  };

  if (!questionId || !Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  // Max 5 answers, non-empty strings only
  const rawAnswers: string[] = answers
    .filter((a) => typeof a === "string" && a.trim().length > 0)
    .slice(0, 5);

  if (rawAnswers.length === 0) {
    return NextResponse.json({ error: "No valid answers" }, { status: 400 });
  }

  const question = await prisma.frequencyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, status: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  // Prevent duplicate submissions
  if (userId) {
    const existing = await prisma.frequencySubmission.findUnique({
      where: { questionId_userId: { questionId, userId } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }
  } else if (sessionId) {
    // Guest duplicate check via session cookie
    const guestExisting = await prisma.frequencySubmission.findFirst({
      where: { questionId, sessionId },
    });
    if (guestExisting) {
      return NextResponse.json({ error: "Already submitted" }, { status: 409 });
    }
  }

  // Upsert each answer into FrequencyAnswer and increment count
  for (const raw of rawAnswers) {
    const normalized = normalizeAnswer(raw);
    if (!normalized) continue;
    await prisma.frequencyAnswer.upsert({
      where: { questionId_text: { questionId, text: normalized } },
      create: { questionId, text: normalized, displayText: raw.trim(), count: 1 },
      update: { count: { increment: 1 } },
    });
  }

  // Create the submission (score = 0 until revealed/recalculated)
  // For guests, ensure we have a session ID (generate one if the client didn't send one)
  const effectiveSessionId = userId ? null : (sessionId || randomUUID());
  const submission = await prisma.frequencySubmission.create({
    data: {
      questionId,
      userId: userId ?? null,
      sessionId: effectiveSessionId,
      answers: rawAnswers,
      score: 0,
    },
  });

  // If the question is already revealed, calculate score immediately
  let score = 0;
  let results = null;

  if (question.status === "revealed") {
    const allAnswers = await prisma.frequencyAnswer.findMany({
      where: { questionId },
      orderBy: { count: "desc" },
    });
    const totalSubmissions = await prisma.frequencySubmission.count({ where: { questionId } });
    for (const raw of rawAnswers) {
      const normalized = normalizeAnswer(raw);
      const match = allAnswers.find((a) => a.text === normalized);
      if (match && totalSubmissions > 0) {
        score += Math.round((match.count / totalSubmissions) * 100);
      }
    }
    await prisma.frequencySubmission.update({
      where: { id: submission.id },
      data: { score },
    });
    results = { answers: allAnswers, totalSubmissions };
  }

  const response = NextResponse.json({ success: true, submissionId: submission.id, score, results });

  // Set a persistent guest session cookie so the page can detect returning guests
  if (!userId && effectiveSessionId) {
    response.cookies.set('pw_freq_session', effectiveSessionId, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
      httpOnly: false, // readable by client-side JS for dedup pre-submit
    });
  }

  return response;
}
