import "dotenv/config";
import prisma from "@/lib/prisma";

async function run() {
  const puzzleId = process.argv[2] || "cmkniucb00002m1n0i8mwkyef";
  const stageIndex = Number(process.argv[3] ?? 1);
  const answer = process.argv[4] ?? "warehouse";

  try {
    const er = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId }, select: { id: true } });
    if (!er) return console.log('Escape room not found for', puzzleId);
    const stage = await prisma.escapeStage.findFirst({ where: { escapeRoomId: er.id, order: stageIndex } });
    if (!stage) return console.log('Stage not found for index', stageIndex);
    console.log('Stage correctAnswer:', stage.correctAnswer);
    if (stage.correctAnswer) {
      const ok = stage.correctAnswer.trim().toLowerCase() === String(answer).trim().toLowerCase();
      console.log('Submitted answer:', answer, 'OK?', ok);
    } else {
      console.log('Stage has no correctAnswer; no check performed.');
    }
  } catch (e) {
    console.error('Error testing submit', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
