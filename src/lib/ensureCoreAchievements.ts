import prisma from "@/lib/prisma";

export async function ensureGridlockArcAchievement() {
  return prisma.achievement.upsert({
    where: { name: "gridlock_arc_complete" },
    update: {
      title: "Arc Complete",
      description: "Solved all 7 days of a Gridlock arc",
      icon: "🗂️",
      category: "special",
      rarity: "exclusive",
      requirement: "Complete a full 7-day Gridlock arc",
      conditionType: "custom",
      conditionValue: undefined,
    },
    create: {
      name: "gridlock_arc_complete",
      title: "Arc Complete",
      description: "Solved all 7 days of a Gridlock arc",
      icon: "🗂️",
      category: "special",
      rarity: "exclusive",
      requirement: "Complete a full 7-day Gridlock arc",
      conditionType: "custom",
    },
  });
}