import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main(){
  const targetEscapeRoomId = 'cmkelfjii0005m1iczes39ld9';
  const existing = await prisma.escapeStage.findMany({ where: { escapeRoomId: targetEscapeRoomId } });
  if(existing.length>0){
    console.log('Stages already present for target escapeRoomId:', targetEscapeRoomId);
    await prisma.$disconnect();
    return;
  }

  await prisma.escapeStage.create({ data: {
    escapeRoomId: targetEscapeRoomId,
    order: 1,
    title: 'Find the Key',
    description: 'Search the desk and pick up the golden key.',
    puzzleType: 'text',
    puzzleData: JSON.stringify({}),
    correctAnswer: 'golden_key',
    hints: JSON.stringify(['Look under the blotter on the desk.']),
  }});

  console.log('Created stage for escapeRoom', targetEscapeRoomId);
  await prisma.$disconnect();
}

main().catch(async(e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
