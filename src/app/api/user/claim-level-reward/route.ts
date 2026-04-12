import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { grantLevelReward } from "@/lib/grantLevelReward";

/**
 * POST /api/user/claim-level-reward
 *
 * Called by the client after a level-up is detected. Idempotent — concurrent
 * or repeated calls are safe; only the first succeeds in granting the reward.
 *
 * Response: { reward: LevelReward | null }
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const reward = await grantLevelReward(user.id);
  return NextResponse.json({ reward });
}
