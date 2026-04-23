import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail: unknown = body?.email;
    const rawSessionId: unknown = body?.sessionId;

    if (typeof rawEmail !== 'string' || !rawEmail.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Basic format validation (no regex injection risk — just a sanity check)
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Email address is too long.' }, { status: 400 });
    }

    // sessionId links this signup to a guest frequency submission so points
    // can be credited when the user verifies their email on launch day.
    const sessionId =
      typeof rawSessionId === 'string' && rawSessionId.trim() ? rawSessionId.trim() : null;

    await prisma.waitlistEmail.upsert({
      where: { email },
      create: { email, ...(sessionId ? { sessionId } : {}) },
      // Only overwrite sessionId if a new one is supplied (preserves existing link)
      update: sessionId ? { sessionId } : {},
    });

    return NextResponse.json({ message: "We'll notify you when we launch. See you on the other side." });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
