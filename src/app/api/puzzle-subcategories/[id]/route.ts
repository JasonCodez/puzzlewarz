import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH: Update a subcategory
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const { name, description } = await req.json();
    const subcategory = await prisma.puzzleSubcategory.update({
      where: { id },
      data: { name, description },
    });
    return NextResponse.json(subcategory);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update subcategory.' }, { status: 500 });
  }
}

// DELETE: Delete a subcategory
export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    await prisma.puzzleSubcategory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete subcategory.' }, { status: 500 });
  }
}
