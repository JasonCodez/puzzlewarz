(async () => {
  try {
    const secret = process.env.SOCKET_SECRET || 'mypuzzlewarzsocketsecret';
    const socketUrl = process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const url = socketUrl.replace(/\/$/, '') + '/emit';
    const body = { room: 'smoke-test-room', event: 'smokeTest', payload: { time: new Date().toISOString() } };

    console.log('POST', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-socket-secret': secret },
      body: JSON.stringify(body),
    });
    console.log('status', res && res.status);
    const text = await res.text().catch(() => 'no-body');
    console.log('body:', text);
  } catch (e) {
    console.error('smoke error', e);
    process.exit(2);
  }
})();
