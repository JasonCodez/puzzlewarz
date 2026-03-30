import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuthenticatedUser } from '@/lib/requireAuthenticatedUser';
import { validateSameOrigin } from '@/lib/requestSecurity';

export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }
    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) {
      return currentUser;
    }

    const body = await request.json();
    const { roomId, role } = body;

    if (!roomId || !['solver', 'decoder'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid roomId or role' },
        { status: 400 }
      );
    }

    const relay = await prisma.relayRiddle.findUnique({
      where: { roomId },
      select: {
        roomId: true,
        status: true,
        expiresAt: true,
        solverClues: true,
        encryptedMsg: true,
        cipherType: true,
        solverUserId: true,
        decoderUserId: true,
      },
    });

    if (!relay) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    if (relay.status === 'expired' || relay.expiresAt <= new Date()) {
      return NextResponse.json({ error: 'Room has expired' }, { status: 410 });
    }

    if (relay.status === 'solved') {
      return NextResponse.json({ error: 'Room is already solved' }, { status: 409 });
    }

    if (role === 'solver') {
      if (relay.decoderUserId === currentUser.id) {
        return NextResponse.json({ error: 'You cannot join both relay roles' }, { status: 409 });
      }
      if (relay.solverUserId && relay.solverUserId !== currentUser.id) {
        return NextResponse.json({ error: 'Solver role is already taken' }, { status: 409 });
      }
    }

    if (role === 'decoder') {
      if (relay.solverUserId === currentUser.id) {
        return NextResponse.json({ error: 'You cannot join both relay roles' }, { status: 409 });
      }
      if (relay.decoderUserId && relay.decoderUserId !== currentUser.id) {
        return NextResponse.json({ error: 'Decoder role is already taken' }, { status: 409 });
      }
    }

    let updatedRelay;
    if (role === 'solver') {
      updatedRelay = relay.solverUserId === currentUser.id
        ? relay
        : await prisma.relayRiddle.update({
            where: { roomId },
            data: { solverUserId: currentUser.id, status: 'in_progress' },
          });
    } else {
      updatedRelay = relay.decoderUserId === currentUser.id
        ? relay
        : await prisma.relayRiddle.update({
            where: { roomId },
            data: { decoderUserId: currentUser.id, status: 'in_progress' },
          });
    }

    const clues = JSON.parse(relay.solverClues);
    const view =
      role === 'solver'
        ? { clues }
        : {
            encryptedMessage: relay.encryptedMsg,
            cipherType: relay.cipherType,
          };

    return NextResponse.json({
      joined: true,
      role,
      roomId: updatedRelay.roomId,
      view,
    });
  } catch (error) {
    console.error('Failed to join relay room:', error);
    return NextResponse.json(
      { error: 'Failed to join relay room' },
      { status: 500 }
    );
  }
}
