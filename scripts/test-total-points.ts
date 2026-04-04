import prisma from "../src/lib/prisma";

async function test() {
  try {
    const user = await prisma.user.findFirst({ select: { id: true, totalPoints: true } });
    console.log("User totalPoints:", user?.totalPoints);
    const progress = await prisma.userPuzzleProgress.findFirst({ select: { solved: true, attempts: true, puzzleId: true, solvedAt: true } });
    console.log("Progress record:", progress);
    console.log("Prisma queries OK");
  } catch (e: any) {
    console.error("Error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
test();
