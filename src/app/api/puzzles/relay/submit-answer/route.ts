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
    const { roomId, answer } = body;

    if (!roomId || !answer) {
      return NextResponse.json(
        { error: 'Missing roomId or answer' },
        { status: 400 }
      );
    }

    const participant = await requireRelayParticipant(roomId, { requiredRole: 'solver' });
    if (participant instanceof NextResponse) {
      return participant;
    }

    const relay = await prisma.relayRiddle.findUnique({
      where: { roomId },
      select: { solverAnswer: true },
    });

    if (!relay) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    const isCorrect =
      answer.toString().toLowerCase() === relay.solverAnswer.toLowerCase();

    if (isCorrect) {
      await prisma.relayRiddle.update({
        where: { roomId },
        data: { solverSubmittedAt: new Date() },
      });
    }

    return NextResponse.json({
      correct: isCorrect,
      feedback: isCorrect
        ? 'Correct! Share this key with your Decoder.'
        : 'Not quite right. Try again or ask for a hint.',
    });
  } catch (error) {
    console.error('Failed to submit answer:', error);
    return NextResponse.json(
      { error: 'Failed to submit answer' },
      { status: 500 }
    );
  }
}
