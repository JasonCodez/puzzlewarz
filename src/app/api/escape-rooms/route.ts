import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/requireAdmin';

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const escapeRooms = await prisma.escapeRoomPuzzle.findMany({
      include: { puzzle: true },
    });
    return NextResponse.json({ escapeRooms });
  } catch (error) {
    console.error('[ESCAPE ROOMS] Failed to fetch escape rooms', error);
    return NextResponse.json({ error: 'Failed to fetch escape rooms' }, { status: 500 });
  }
}
