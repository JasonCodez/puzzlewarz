import { prisma } from "@/lib/prisma";
import {
  buildFrequencyCanonicalConfig,
  calculateFrequencyScore,
  canonicalizeFrequencyAnswer,
  getFrequencyCanonicalDisplayText,
} from "@/lib/frequency";

type FrequencyAnswerRow = {
  id: string;
  displayText: string;
  text: string;
  count: number;
};

async function getQuestionCanonicalConfig(questionId: string) {
  const question = await prisma.frequencyQuestion.findUnique({
    where: { id: questionId },
    select: { id: true, status: true, canonicalGroups: true },
  });

  if (!question) {
    throw new Error("Question not found");
  }

  return {
    question,
    config: buildFrequencyCanonicalConfig(question.canonicalGroups),
  };
}

export async function rebuildFrequencyAnswerGroups(questionId: string): Promise<{
  answers: FrequencyAnswerRow[];
  totalSubmissions: number;
}> {
  const { config } = await getQuestionCanonicalConfig(questionId);
  const submissions = await prisma.frequencySubmission.findMany({
    where: { questionId },
    select: { answers: true },
  });

  const groupedAnswers = new Map<string, { displayText: string; count: number }>();

  for (const submission of submissions) {
    const rawAnswers = Array.isArray(submission.answers) ? submission.answers : [];

    for (const raw of rawAnswers) {
      if (typeof raw !== "string") continue;

      const canonical = canonicalizeFrequencyAnswer(raw, config);
      if (!canonical) continue;

      const existing = groupedAnswers.get(canonical);
      if (existing) {
        existing.count += 1;
        continue;
      }

      groupedAnswers.set(canonical, {
        displayText: getFrequencyCanonicalDisplayText(canonical, raw, config),
        count: 1,
      });
    }
  }

  const answerRows = Array.from(groupedAnswers.entries())
    .map(([text, value]) => ({
      questionId,
      text,
      displayText: value.displayText,
      count: value.count,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.displayText.localeCompare(right.displayText);
    });

  await prisma.$transaction(async (tx) => {
    await tx.frequencyAnswer.deleteMany({ where: { questionId } });

    if (answerRows.length > 0) {
      await tx.frequencyAnswer.createMany({ data: answerRows });
    }
  });

  const answers = await prisma.frequencyAnswer.findMany({
    where: { questionId },
    orderBy: [{ count: "desc" }, { displayText: "asc" }],
    select: { id: true, displayText: true, text: true, count: true },
  });

  return { answers, totalSubmissions: submissions.length };
}

export async function recalculateFrequencyScores(questionId: string): Promise<number> {
  const { config } = await getQuestionCanonicalConfig(questionId);
  const submissions = await prisma.frequencySubmission.findMany({
    where: { questionId },
    select: { id: true, answers: true },
  });
  const answerBuckets = await prisma.frequencyAnswer.findMany({
    where: { questionId },
    select: { text: true, count: true },
  });

  const totalSubmissions = submissions.length;

  for (const submission of submissions) {
    const rawAnswers = Array.isArray(submission.answers)
      ? submission.answers.filter((value): value is string => typeof value === "string")
      : [];

    const score = calculateFrequencyScore(rawAnswers, answerBuckets, totalSubmissions, config);

    await prisma.frequencySubmission.update({
      where: { id: submission.id },
      data: { score },
    });
  }

  return submissions.length;
}

export async function getFrequencyCanonicalConfigForQuestion(questionId: string) {
  return getQuestionCanonicalConfig(questionId);
}