import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const raw: unknown = body?.email;

    if (typeof raw !== 'string' || !raw.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Basic format validation (no regex injection risk — just a sanity check)
    const email = raw.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    if (email.length > 254) {
      return NextResponse.json({ error: 'Email address is too long.' }, { status: 400 });
    }

    await prisma.waitlistEmail.upsert({
      where: { email },
      create: { email },
      update: {}, // already registered — no-op, but return success
    });

    return NextResponse.json({ message: "We'll notify you when we launch. See you on the other side." });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
