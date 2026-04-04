import React, { Suspense } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/prisma";
import ActivityFeedClient from "@/components/activity-feed/ActivityFeedClient";

interface UserInfo {
  image?: string | null;
  name?: string | null;
  email?: string | null;
}

async function getActivities() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.activity.count({ where: { userId: user.id } }),
  ]);

  return { activities, total, user };
}

export default async function ActivityFeedPage() {
  const { activities, total, user } = await getActivities();
  const session = await getServerSession(authOptions);
  const userInfo: UserInfo = {
    image: user.image,
    name: user.name,
    email: user.email,
  };

  return (
    <div style={{ backgroundColor: '#020202', backgroundImage: 'linear-gradient(135deg, #020202 0%, #0a0a0a 50%, #020202 100%)' }} className="min-h-screen">

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Activity Feed</h1>
          <p className="text-gray-400">
            Track your recent activities and account changes
          </p>
        </div>

        <Suspense fallback={<ActivityFeedSkeleton />}>
          <ActivityFeedClient activities={activities} total={total} />
        </Suspense>
      </div>
    </div>
  );
}

function ActivityFeedSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="h-20 bg-slate-800 rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}
