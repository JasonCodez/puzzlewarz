import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main(){
  const targetStage = await prisma.escapeStage.findFirst({ where: { title: 'Find the Key' } });
  if(!targetStage){
    console.log('No stage found to fix');
    await prisma.$disconnect();
    return;
  }

  const puzzle = await prisma.puzzle.findFirst({ where: { title: 'Seed: The Detective Office' } });
  if(!puzzle){
    console.error('Seed puzzle not found');
    await prisma.$disconnect();
    process.exit(1);
  }

  const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId: puzzle.id } });
  if(!escapeRoom){
    console.error('escapeRoom not found for puzzle');
    await prisma.$disconnect();
    process.exit(1);
  }

  if(targetStage.escapeRoomId === escapeRoom.id){
    console.log('Stage already linked correctly');
    await prisma.$disconnect();
    return;
  }

  await prisma.escapeStage.update({ where: { id: targetStage.id }, data: { escapeRoomId: escapeRoom.id } });
  console.log('Updated stage link to escapeRoomId', escapeRoom.id);
  await prisma.$disconnect();
}

main().catch(async(e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
