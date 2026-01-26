export async function postToSocket(endpoint: string, body: any) {
  try {
    const socketUrl = process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const url = socketUrl.replace(/\/$/, '') + (endpoint.startsWith('/') ? endpoint : '/' + endpoint);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (process.env.SOCKET_SECRET) headers['x-socket-secret'] = process.env.SOCKET_SECRET;
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    return res;
  } catch (e) {
    // swallow errors — callers often treat socket pushes as best-effort
    return null;
  }
}
