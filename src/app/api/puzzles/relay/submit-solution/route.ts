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
    const { roomId, decodedMessage } = body;

    if (!roomId || !decodedMessage) {
      return NextResponse.json(
        { error: 'Missing roomId or decodedMessage' },
        { status: 400 }
      );
    }

    const participant = await requireRelayParticipant(roomId, { requiredRole: 'decoder' });
    if (participant instanceof NextResponse) {
      return participant;
    }

    const expectedDecoded = 'HELLO WORLD';
    const isSolved =
      decodedMessage.toUpperCase() === expectedDecoded.toUpperCase();

    if (isSolved) {
      await prisma.relayRiddle.update({
        where: { roomId },
        data: { solvedAt: new Date(), status: 'solved' },
      });
    }

    return NextResponse.json({
      solved: isSolved,
      feedback: isSolved
        ? 'Excellent! You decoded it correctly. Team reward earned!'
        : 'Not correct. Try again after checking the key from your Solver.',
    });
  } catch (error) {
    console.error('Failed to submit solution:', error);
    return NextResponse.json(
      { error: 'Failed to submit solution' },
      { status: 500 }
    );
  }
}
