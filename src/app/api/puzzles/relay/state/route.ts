import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const roomId = request.nextUrl.searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing roomId' },
        { status: 400 }
      );
    }

    // Find relay room
    const relay = await prisma.relayRiddle.findUnique({
      where: { roomId },
      include: {
        solver: { select: { id: true, name: true } },
        decoder: { select: { id: true, name: true } },
      },
    });

    if (!relay) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (relay.solverUserId !== currentUser.id && relay.decoderUserId !== currentUser.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({
      roomId: relay.roomId,
      status: relay.status,
      solver: relay.solver,
      decoder: relay.decoder,
      solverReady: !!relay.solverSubmittedAt,
      solvedAt: relay.solvedAt,
      expiresAt: relay.expiresAt,
    });
  } catch (error) {
    console.error('Failed to fetch room state:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room state' },
      { status: 500 }
    );
  }
}
