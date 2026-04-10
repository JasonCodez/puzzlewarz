import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getGridlockFileData, sanitizeGridlockForClient } from '@/lib/gridlockFile';

// GET /api/gridlock/guest/[id]/state
// Public — no auth required. Returns sanitized puzzle data only.
// All progress tracking for guest players lives in localStorage client-side.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: puzzleId } = await params;

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { id: true, puzzleType: true, data: true },
    });

    if (!puzzle || puzzle.puzzleType !== 'gridlock_file') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const fileData = getGridlockFileData(puzzle.data);
    if (!fileData) {
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    return NextResponse.json({
      puzzleId,
      puzzle: sanitizeGridlockForClient(fileData),
    });
  } catch (e) {
    console.error('[gridlock/guest/state]', e);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
