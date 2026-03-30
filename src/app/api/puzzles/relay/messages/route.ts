import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireRelayParticipant } from '@/lib/relayAccess';

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Missing roomId' },
        { status: 400 }
      );
    }

    const participant = await requireRelayParticipant(roomId);
    if (participant instanceof NextResponse) {
      return participant;
    }

    const messages = await prisma.relayMessage.findMany({
      where: { relayId: participant.relay.id },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const formattedMessages = messages.map((msg: { id: string; userId?: string | null; user?: { id: string; name?: string | null } | null; message: string; createdAt: Date }) => ({
      id: msg.id,
      userId: msg.userId || undefined,
      userName: msg.user?.name || 'Unknown',
      userRole: msg.userId === participant.relay.solverUserId ? 'solver' : msg.userId === participant.relay.decoderUserId ? 'decoder' : 'unknown',
      message: msg.message,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({
      messages: formattedMessages,
    });
  } catch (error) {
    console.error('Failed to fetch messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
