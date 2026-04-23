import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";
import { enforceRateLimit, getClientAddress } from "@/lib/requestSecurity";
import { calcLevel } from "@/lib/levels";

const VerifySchema = z.object({
  email: z.string().email(),
  token: z.string().min(10),
});

export async function POST(request: NextRequest) {
  try {
    const ipRateLimit = await enforceRateLimit({
      key: `auth:verify-email:ip:${getClientAddress(request)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification attempts. Please try again later.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    const body = await request.json();
    const { email: rawEmail, token } = VerifySchema.parse(body);
    const email = rawEmail.trim().toLowerCase();

    const emailRateLimit = await enforceRateLimit({
      key: `auth:verify-email:email:${email}`,
      limit: 8,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification attempts for this email. Please try again later.",
    });
    if (emailRateLimit) {
      return emailRateLimit;
    }

    const record = await prisma.verificationToken.findFirst({
      where: { identifier: email, token },
    });

    if (!record) {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    if (record.expires.getTime() < Date.now()) {
      await prisma.verificationToken.deleteMany({ where: { identifier: email } });
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const wasAlreadyVerified = !!user.emailVerified;

    if (!wasAlreadyVerified) {
      // Grant Founder badge to the first 1000 email-verified users
      const verifiedCount = await prisma.user.count({
        where: { isBot: false, emailVerified: { not: null } },
      });
      const isFounder = verifiedCount < 1000;

      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date(), ...(isFounder ? { isFounder: true } : {}) },
      });
    }

    await prisma.verificationToken.deleteMany({ where: { identifier: email } });

    // Award 100 points to the referrer — only once, only after email is confirmed
    if (!wasAlreadyVerified) {
      try {
        const referral = await prisma.userReferral.findFirst({
          where: { refereeId: user.id, referralRewardedAt: null },
        });
        if (referral) {
          await prisma.$transaction([
            prisma.user.update({
              where: { id: referral.referrerId },
              data: { totalPoints: { increment: 100 } },
            }),
            prisma.userReferral.update({
              where: { id: referral.id },
              data: { referralRewardedAt: new Date() },
            }),
          ]);
        }
      } catch (err) {
        // Non-fatal — don't block verification if reward fails
        console.error("[verify-email] Failed to award referral points:", err);
      }
    }

    // Credit pre-launch guest rewards — only once, only after first email confirmation
    let prelaunchRewards: { xp: number; points: number; solves: number } | null = null;
    if (!wasAlreadyVerified) {
      try {
        const freshUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { prelaunchAnonId: true, prelaunchRewardXp: true, prelaunchRewardPoints: true, xp: true, totalPoints: true },
        });
        if (freshUser?.prelaunchAnonId && (freshUser.prelaunchRewardXp > 0 || freshUser.prelaunchRewardPoints > 0)) {
          const anonId = freshUser.prelaunchAnonId;
          const xpToAdd = freshUser.prelaunchRewardXp;
          const pointsToAdd = freshUser.prelaunchRewardPoints;
          const newXp = (freshUser.xp ?? 0) + xpToAdd;
          const { level, title } = calcLevel(newXp);

          // Count the guest solves to show accurate "N puzzles solved" in the modal
          const solveCount = await prisma.gridlockSolve.count({
            where: { anonId, userId: null },
          });

          await prisma.$transaction([
            prisma.user.update({
              where: { id: user.id },
              data: {
                xp: newXp,
                level,
                xpTitle: title,
                totalPoints: { increment: pointsToAdd },
                prelaunchAnonId: null,
                prelaunchRewardXp: 0,
                prelaunchRewardPoints: 0,
              },
            }),
            prisma.gridlockSolve.updateMany({
              where: { anonId, userId: null },
              data: { userId: user.id },
            }),
          ]);

          prelaunchRewards = { xp: xpToAdd, points: pointsToAdd, solves: solveCount };
        }
      } catch (err) {
        console.error("[verify-email] Failed to credit pre-launch rewards:", err);
        // Non-fatal — don't block verification
      }
    }

    // Credit pre-launch frequency puzzle points tied to a waitlist/notify signup
    // Only once, only after first email confirmation
    if (!wasAlreadyVerified) {
      try {
        const waitlistEntry = await prisma.waitlistEmail.findUnique({
          where: { email },
          select: { sessionId: true },
        });
        if (waitlistEntry?.sessionId) {
          const freqSessionId = waitlistEntry.sessionId;
          const freqSubmissions = await prisma.frequencySubmission.findMany({
            where: { sessionId: freqSessionId, userId: null },
            select: { score: true },
          });
          const totalScore = freqSubmissions.reduce((sum, s) => sum + (s.score ?? 0), 0);
          if (totalScore > 0) {
            // Re-read XP (may have been updated by the gridlock prelaunch block above)
            const userNow = await prisma.user.findUnique({
              where: { id: user.id },
              select: { xp: true },
            });
            const newXp = (userNow?.xp ?? 0) + totalScore;
            const { level, title } = calcLevel(newXp);
            await prisma.user.update({
              where: { id: user.id },
              data: { xp: newXp, level, xpTitle: title, totalPoints: { increment: totalScore } },
            });
            // Merge into prelaunchRewards so the reward modal shows on verify page
            if (prelaunchRewards) {
              prelaunchRewards.xp += totalScore;
              prelaunchRewards.points += totalScore;
            } else {
              prelaunchRewards = { xp: totalScore, points: totalScore, solves: 0 };
            }
          }
          // Clear sessionId to prevent double-crediting
          await prisma.waitlistEmail.update({
            where: { email },
            data: { sessionId: null },
          });
        }
      } catch (err) {
        console.error("[verify-email] Failed to credit frequency pre-launch rewards:", err);
        // Non-fatal — don't block verification
      }
    }

    return NextResponse.json({ ok: true, prelaunchRewards });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input", details: error.issues }, { status: 400 });
    }
    console.error("verify-email failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
