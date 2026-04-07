import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const userId = (session.user as { id?: string })?.id;
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role !== "admin") return null;
  return session;
}

// GET /api/admin/frequency — list questions (upcoming + recent)
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const questions = await prisma.frequencyQuestion.findMany({
    orderBy: { scheduledFor: "desc" },
    take: 30,
    select: {
      id: true,
      question: true,
      scheduledFor: true,
      status: true,
      _count: { select: { submissions: true, answers: true } },
    },
  });

  return NextResponse.json({ questions });
}

// POST /api/admin/frequency — create or schedule a question
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { question, scheduledFor } = body as { question: string; scheduledFor: string };

  if (!question?.trim() || !scheduledFor) {
    return NextResponse.json({ error: "question and scheduledFor are required" }, { status: 400 });
  }

  const [y, m, d] = scheduledFor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));

  const created = await prisma.frequencyQuestion.create({
    data: { question: question.trim(), scheduledFor: date, status: "pending" },
  });

  return NextResponse.json({ question: created });
}

// PATCH /api/admin/frequency — reveal a question (recalculate all scores)
export async function PATCH(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { questionId } = body as { questionId: string };

  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  // Mark as revealed
  await prisma.frequencyQuestion.update({
    where: { id: questionId },
    data: { status: "revealed" },
  });

  // Recalculate scores for all submissions
  const submissions = await prisma.frequencySubmission.findMany({
    where: { questionId },
    select: { id: true, answers: true },
  });

  const allAnswers = await prisma.frequencyAnswer.findMany({
    where: { questionId },
    select: { text: true, count: true },
  });

  const totalSubmissions = submissions.length;

  function normalizeAnswer(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  }

  for (const sub of submissions) {
    const rawAnswers = sub.answers as string[];
    let score = 0;
    for (const raw of rawAnswers) {
      const normalized = normalizeAnswer(raw);
      const match = allAnswers.find((a) => a.text === normalized);
      if (match && totalSubmissions > 0) {
        score += Math.round((match.count / totalSubmissions) * 100);
      }
    }
    await prisma.frequencySubmission.update({
      where: { id: sub.id },
      data: { score },
    });
  }

  return NextResponse.json({ success: true, recalculated: submissions.length });
}

// DELETE /api/admin/frequency — delete a question and all its data
export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const questionId = searchParams.get("questionId");

  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  // Cascade: delete submissions and answers first (in case DB constraints require it)
  await prisma.frequencySubmission.deleteMany({ where: { questionId } });
  await prisma.frequencyAnswer.deleteMany({ where: { questionId } });
  await prisma.frequencyQuestion.delete({ where: { id: questionId } });

  return NextResponse.json({ success: true });
}
