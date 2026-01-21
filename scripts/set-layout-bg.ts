import path from 'path';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

const layoutId = 'cmkelfjij0007m1icbdjexhtw';

async function main(){
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800' viewBox='0 0 1200 800'>
    <rect width='100%' height='100%' fill='#2d3748' />
    <rect x='80' y='520' width='1040' height='160' rx='8' fill='#8b5e3c' />
    <rect x='120' y='480' width='960' height='60' rx='6' fill='#6b4a32' />
    <circle cx='360' cy='500' r='28' fill='#ffd166' />
    <rect x='300' y='480' width='120' height='40' rx='4' fill='#f9c74f' />
    <text x='340' y='506' font-size='12' text-anchor='middle' fill='#3a3a3a' font-family='sans-serif'>Golden Key</text>
  </svg>`;

  const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);

  const updated = await prisma.roomLayout.update({
    where: { id: layoutId },
    data: { backgroundUrl: dataUrl },
  });

  console.log('Updated layout', updated.id, 'backgroundUrl length', (updated.backgroundUrl || '').length);
  await prisma.$disconnect();
}

main().catch(async(e)=>{ console.error(e); await prisma.$disconnect(); process.exit(1); });
