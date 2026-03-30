import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRelayParticipant } from '@/lib/relayAccess';
import { validateSameOrigin } from '@/lib/requestSecurity';

export async function POST(request: NextRequest) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) {
      return sameOriginError;
    }
    const body = await request.json();
    const { roomId, message } = body;
    const trimmedMessage = typeof message === 'string' ? message.trim() : '';

    if (!roomId || !trimmedMessage) {
      return NextResponse.json(
        { error: 'Missing roomId or message' },
        { status: 400 }
      );
    }

    const participant = await requireRelayParticipant(roomId);
    if (participant instanceof NextResponse) {
      return participant;
    }

    const msg = await prisma.relayMessage.create({
      data: {
        relayId: participant.relay.id,
        userId: participant.currentUser.id,
        message: trimmedMessage,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    return NextResponse.json({
      id: msg.id,
      userId: msg.userId,
      userName: msg.user?.name || 'Unknown',
      userRole: participant.role,
      message: msg.message,
      createdAt: msg.createdAt,
    });
  } catch (error) {
    console.error('Failed to send message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
