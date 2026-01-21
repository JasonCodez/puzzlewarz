import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main(){
  const rooms = await prisma.escapeRoomPuzzle.findMany({});
  console.log('escape rooms count:', rooms.length);
  for(const r of rooms){
    console.log({ id: r.id, puzzleId: r.puzzleId, title: r.roomTitle });
  }
  await prisma.$disconnect();
}

main().catch(async(e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
