import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { resolvePublicPath, resolveUploadsPath } from '@/lib/uploadStorage';

export const runtime = 'nodejs';

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return typeof err === 'object' && err !== null && 'code' in err;
}

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
    const isAvatarPath = safeParts[0] === 'avatars';

    // Primary: persistent uploads dir
    const uploadPath = resolveUploadsPath(...safeParts);
    try {
      const buf = await readFile(uploadPath);
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': contentTypeForFile(uploadPath),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (err) {
      if (isNodeError(err) && err.code && err.code !== 'ENOENT') {
        console.error('[uploads] failed reading uploads dir file', { uploadPath, code: err.code });
        return NextResponse.json({ error: 'internal' }, { status: 500 });
      }
      // Fallback: legacy public/uploads
      const publicPath = resolvePublicPath('uploads', ...safeParts);
      try {
        const buf = await readFile(publicPath);
        return new NextResponse(buf, {
          status: 200,
          headers: {
            'Content-Type': contentTypeForFile(publicPath),
            'Cache-Control': 'public, max-age=3600',
          },
        });
      } catch (err2) {
        if (isNodeError(err2) && err2.code && err2.code !== 'ENOENT') {
          console.error('[uploads] failed reading public file', { publicPath, code: err2.code });
          return NextResponse.json({ error: 'internal' }, { status: 500 });
        }

        if (isAvatarPath) {
          const fallbackAvatar = resolvePublicPath('images', 'default-avatar.svg');
          try {
            const fallbackBuf = await readFile(fallbackAvatar);
            return new NextResponse(fallbackBuf, {
              status: 200,
              headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'public, max-age=3600',
              },
            });
          } catch (fallbackErr) {
            if (isNodeError(fallbackErr) && fallbackErr.code && fallbackErr.code !== 'ENOENT') {
              console.error('[uploads] failed reading avatar fallback file', { fallbackAvatar, code: fallbackErr.code });
              return NextResponse.json({ error: 'internal' }, { status: 500 });
            }
          }
        }

        return NextResponse.json({ error: 'not found' }, { status: 404 });
      }
    }
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
