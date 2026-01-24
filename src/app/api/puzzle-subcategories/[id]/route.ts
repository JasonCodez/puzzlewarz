import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH: Update a subcategory
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { name, description } = await req.json();
    const subcategory = await prisma.puzzleSubcategory.update({
      where: { id: params.id },
      data: { name, description },
    });
    return NextResponse.json(subcategory);
  } catch (err) {
    return NextResponse.json({ error: 'Failed to update subcategory.' }, { status: 500 });
  }
}

// DELETE: Delete a subcategory
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.puzzleSubcategory.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to delete subcategory.' }, { status: 500 });
  }
}
