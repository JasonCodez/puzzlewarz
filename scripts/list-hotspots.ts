import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

async function main(){
  const h = await prisma.hotspot.findMany();
  console.log('hotspots count:', h.length);
  for(const s of h){
    console.log({ id: s.id, layoutId: s.layoutId, x: s.x, y: s.y, w: s.w, h: s.h, type: s.type, targetId: s.targetId, meta: s.meta });
  }
  await prisma.$disconnect();
}

main().catch(async(e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
