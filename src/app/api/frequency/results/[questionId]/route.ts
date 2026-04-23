import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function isAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return false;

  const userId = (session.user as { id?: string }).id;
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === "admin";
}

// GET /api/frequency/results/[questionId]
export async function GET(
  _request: Request,
  context: { params: Promise<{ questionId: string }> }
) {
  const { questionId } = await context.params;

  const question = await prisma.frequencyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, question: true, status: true },
  });

  if (!question) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (question.status !== "revealed" && !(await isAdmin())) {
    return NextResponse.json({ error: "Results are locked until reveal" }, { status: 403 });
  }

  const answers = await prisma.frequencyAnswer.findMany({
    where: { questionId },
    orderBy: { count: "desc" },
    select: { id: true, displayText: true, text: true, count: true },
  });

  const totalSubmissions = await prisma.frequencySubmission.count({
    where: { questionId },
  });

  return NextResponse.json({ question, answers, totalSubmissions });
}
