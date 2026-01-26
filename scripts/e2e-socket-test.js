const { io } = require('socket.io-client');

const SOCKET_URL = process.env.SOCKET_URL || 'http://localhost:4001';
const SECRET = process.env.SOCKET_SECRET || '';

const teamId = 'e2e-team-1';
const puzzleId = 'e2e-puzzle-1';
const roomKey = `${teamId}::${puzzleId}`;

function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function makeClient(userId, isAdmin = false) {
  return new Promise((res, rej) => {
    const s = io(SOCKET_URL, { transports: ['websocket'] });
    s.on('connect', () => {
      s.emit('joinLobby', { teamId, puzzleId, userId, name: userId, isAdmin });
      res(s);
    });
    s.on('connect_error', (err) => {
      rej(err);
    });
  });
}

async function run() {
  console.log('Starting E2E socket test ->', SOCKET_URL);
  const ids = ['u1','u2','u3','u4'];
  const clients = [];
  for (let i=0;i<ids.length;i++) {
    const c = await makeClient(ids[i], i===0);
    clients.push(c);
    console.log('connected', ids[i]);
  }

  // set listeners for puzzleStarting and rolesAssigned
  const startedPromises = ids.map((id, idx) => new Promise((res) => {
    clients[idx].once('puzzleStarting', (payload) => {
      console.log(id, 'received puzzleStarting', payload);
      res(payload);
    });
  }));

  const rolesPromises = ids.map((id, idx) => new Promise((res) => {
    clients[idx].once('rolesAssigned', (payload) => {
      console.log(id, 'received rolesAssigned', payload.assignments || payload);
      res(payload);
    });
  }));

  // mark all ready
  for (let i=0;i<ids.length;i++) {
    clients[i].emit('setReady', { teamId, puzzleId, userId: ids[i], ready: true });
  }

  await wait(300);

  // leader triggers start
  console.log('leader triggering startPuzzle');
  clients[0].emit('startPuzzle', { teamId, puzzleId, userId: ids[0] });

  // wait for puzzleStarting on all
  const started = await Promise.allSettled(startedPromises.map(p => p.then(x=>x).catch(e=>{throw e})));
  const okStart = started.filter(s=>s.status==='fulfilled').length;
  console.log('puzzleStarting delivered to', okStart, '/', ids.length);

  // now POST rolesAssigned via admin HTTP endpoint
  const assignments = { u1: 'Navigator', u2: 'Solver', u3: 'Researcher', u4: 'Observer' };
  try {
    const resp = await fetch(`${SOCKET_URL.replace(/\/$/, '')}/emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-socket-secret': SECRET },
      body: JSON.stringify({ room: roomKey, event: 'rolesAssigned', payload: { teamId, puzzleId, assignments } }),
    });
    console.log('emit POST status', resp && resp.status);
  } catch (e) {
    console.warn('emit POST failed', e);
  }

  const rolesRes = await Promise.allSettled(rolesPromises);
  const okRoles = rolesRes.filter(s=>s.status==='fulfilled').length;
  console.log('rolesAssigned delivered to', okRoles, '/', ids.length);

  // cleanup
  await wait(200);
  for (const s of clients) try { s.disconnect(); } catch (e) {}
  process.exit(0);
}

run().catch((e) => { console.error('E2E test failed', e); process.exit(2); });
