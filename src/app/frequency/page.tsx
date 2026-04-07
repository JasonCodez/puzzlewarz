import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import FrequencyGame from "@/components/FrequencyGame";
import Navbar from "@/components/Navbar";

export const metadata = { title: "Frequency | PuzzleWarz" };

export default async function FrequencyPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id ?? null;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const question = await prisma.frequencyQuestion.findFirst({
    where: { scheduledFor: today },
    select: { id: true, question: true, status: true, scheduledFor: true },
  });

  let alreadySubmitted = false;
  let existingSubmission = null;
  let results = null;

  if (question) {
    if (userId) {
      existingSubmission = await prisma.frequencySubmission.findUnique({
        where: { questionId_userId: { questionId: question.id, userId } },
        select: { answers: true, score: true },
      });
      alreadySubmitted = !!existingSubmission;
    }

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
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-10 px-4" style={{ backgroundColor: "#020202" }}>
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">📡</p>
          <h1 className="text-3xl font-black text-white tracking-tight">FREQUENCY</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
            Think like the crowd. Score = how many people agreed with you.
          </p>
        </div>

        <FrequencyGame
          question={question
            ? {
                ...question,
                scheduledFor: question.scheduledFor.toISOString(),
              }
            : null}
          alreadySubmitted={alreadySubmitted}
          existingSubmission={existingSubmission as { answers: string[]; score: number } | null}
          initialResults={results}
        />
      </div>
      </main>
    </>
  );
}
