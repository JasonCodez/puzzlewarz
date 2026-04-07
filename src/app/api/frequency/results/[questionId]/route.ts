import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
