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

// POST /api/admin/frequency/merge
// Body: { questionId, keepId, mergeIds: string[] }
// Merges answer rows into the keep row, recalculates counts + scores
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { questionId, keepId, mergeIds } = body as {
    questionId: string;
    keepId: string;
    mergeIds: string[];
  };

  if (!questionId || !keepId || !Array.isArray(mergeIds) || mergeIds.length === 0) {
    return NextResponse.json({ error: "questionId, keepId, mergeIds required" }, { status: 400 });
  }

  // Get total count from answers being merged
  const toMerge = await prisma.frequencyAnswer.findMany({
    where: { id: { in: mergeIds }, questionId },
    select: { id: true, count: true, text: true },
  });

  const extraCount = toMerge.reduce((sum, a) => sum + a.count, 0);
  const mergedTexts = toMerge.map((a) => a.text);

  // Add count to the keeper
  await prisma.frequencyAnswer.update({
    where: { id: keepId },
    data: { count: { increment: extraCount } },
  });

  // Delete merged rows
  await prisma.frequencyAnswer.deleteMany({
    where: { id: { in: mergeIds } },
  });

  // Update all submissions that contained the merged answer texts to use the keeper's text
  const keep = await prisma.frequencyAnswer.findUnique({
    where: { id: keepId },
    select: { text: true },
  });

  if (keep) {
    const submissions = await prisma.frequencySubmission.findMany({
      where: { questionId },
      select: { id: true, answers: true },
    });
    for (const sub of submissions) {
      const rawAnswers = sub.answers as string[];
      const updated = rawAnswers.map((a) => {
        const norm = a.toLowerCase().trim().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
        return mergedTexts.includes(norm) ? keep.text : a;
      });
      if (JSON.stringify(updated) !== JSON.stringify(rawAnswers)) {
        await prisma.frequencySubmission.update({
          where: { id: sub.id },
          data: { answers: updated },
        });
      }
    }
  }

  return NextResponse.json({ success: true, mergedCount: mergeIds.length, extraCount });
}
