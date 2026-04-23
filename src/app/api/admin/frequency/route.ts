import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseFrequencyCanonicalGroupsInput } from "@/lib/frequency";
import { rebuildFrequencyAnswerGroups, recalculateFrequencyScores } from "@/lib/frequency-service";

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
      canonicalGroups: true,
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
  const { question, scheduledFor, canonicalGroupsText = "" } = body as {
    question: string;
    scheduledFor: string;
    canonicalGroupsText?: string;
  };

  if (!question?.trim() || !scheduledFor) {
    return NextResponse.json({ error: "question and scheduledFor are required" }, { status: 400 });
  }

  const [y, m, d] = scheduledFor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  let canonicalGroups;

  try {
    canonicalGroups = parseFrequencyCanonicalGroupsInput(canonicalGroupsText);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid canonical groups" }, { status: 400 });
  }

  const created = await prisma.frequencyQuestion.create({
    data: {
      question: question.trim(),
      scheduledFor: date,
      status: "pending",
      ...(canonicalGroups.length > 0
        ? { canonicalGroups: canonicalGroups as unknown as Prisma.InputJsonValue }
        : {}),
    },
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

  await prisma.frequencyQuestion.update({
    where: { id: questionId },
    data: { status: "revealed" },
  });

  await rebuildFrequencyAnswerGroups(questionId);
  const recalculated = await recalculateFrequencyScores(questionId);

  return NextResponse.json({ success: true, recalculated });
}

// PUT /api/admin/frequency — update canonical answer groups for a question
export async function PUT(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { questionId, canonicalGroupsText = "" } = body as {
    questionId: string;
    canonicalGroupsText?: string;
  };

  if (!questionId) {
    return NextResponse.json({ error: "questionId required" }, { status: 400 });
  }

  let canonicalGroups;
  try {
    canonicalGroups = parseFrequencyCanonicalGroupsInput(canonicalGroupsText);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid canonical groups" }, { status: 400 });
  }

  const updated = await prisma.frequencyQuestion.update({
    where: { id: questionId },
    data: {
      canonicalGroups:
        canonicalGroups.length > 0
          ? (canonicalGroups as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
    },
    select: { id: true, status: true },
  });

  const rebuild = await rebuildFrequencyAnswerGroups(questionId);
  const recalculated = updated.status === "revealed"
    ? await recalculateFrequencyScores(questionId)
    : 0;

  return NextResponse.json({
    success: true,
    groups: canonicalGroups.length,
    answerGroups: rebuild.answers.length,
    recalculated,
  });
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
