import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { resolvePublicPath, resolveUploadsPath } from '@/lib/uploadStorage';

export const runtime = 'nodejs';

function contentTypeForFile(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.avif':
      return 'image/avif';
    default:
      return 'application/octet-stream';
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  try {
    const { path: parts } = await ctx.params;
    const safeParts = (parts || []).filter(Boolean);

    // Primary: persistent uploads dir under content/images
    const uploadPath = resolveUploadsPath('content', 'images', ...safeParts);
    try {
      const buf = await readFile(uploadPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': contentTypeForFile(uploadPath),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch {
      // Fallback: committed public/content/images
      const publicPath = resolvePublicPath('content', 'images', ...safeParts);
      const buf = await readFile(publicPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': contentTypeForFile(publicPath),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
