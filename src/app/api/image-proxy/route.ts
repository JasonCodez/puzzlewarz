import { NextResponse } from 'next/server';

// Simple image proxy for puzzles to avoid CORS blocking when images are hosted
// on third-party hosts. SECURITY: restrict allowed hosts via ALLOWED_IMAGE_HOSTS
// env var (comma-separated). If unset, only allow same-origin (relative URLs).

const ALLOWED = process.env.ALLOWED_IMAGE_HOSTS ? process.env.ALLOWED_IMAGE_HOSTS.split(',').map(s => s.trim()).filter(Boolean) : null;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const target = url.searchParams.get('url');
    if (!target) return NextResponse.json({ error: 'missing url' }, { status: 400 });

    // ensure http/https
    if (!/^https?:\/\//i.test(target) && !target.startsWith('/')) {
      return NextResponse.json({ error: 'invalid url' }, { status: 400 });
    }

    // If allowlist is configured, validate the hostname
    if (ALLOWED) {
      try {
        const parsed = new URL(target, req.url);
        if (!ALLOWED.includes(parsed.hostname)) {
          return NextResponse.json({ error: 'host not allowed' }, { status: 403 });
        }
      } catch (e) {
        return NextResponse.json({ error: 'invalid url' }, { status: 400 });
      }
    } else if (/^https?:\/\//i.test(target)) {
      // no allowlist and target is absolute -> block for safety in production
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'proxying remote hosts is disabled (set ALLOWED_IMAGE_HOSTS)' }, { status: 403 });
      }
      // allow in development for easier testing (beware security risks)
    }

    // Use native fetch on server
    const resp = await fetch(target, { method: 'GET', cache: 'force-cache' });
    if (!resp.ok) return NextResponse.json({ error: 'fetch failed', status: resp.status }, { status: 502 });

    const contentType = resp.headers.get('content-type') || 'application/octet-stream';
    const body = await resp.arrayBuffer();

    return new NextResponse(Buffer.from(body), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('image-proxy error', err);
    return NextResponse.json({ error: 'internal' }, { status: 500 });
  }
}
