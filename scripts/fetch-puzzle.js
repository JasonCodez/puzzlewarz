const id = 'cmkelfjid0003m1ic054bbwhs';
(async () => {
  try {
    const r1 = await fetch(`http://localhost:3000/api/puzzles/${id}`);
    console.log('/api/puzzles/:id status', r1.status);
    const j1 = await r1.json().catch(() => null);
    console.log(JSON.stringify(j1, null, 2));

    const r2 = await fetch(`http://localhost:3000/api/puzzles/escape-room/${id}`);
    console.log('/api/puzzles/escape-room/:id status', r2.status);
    const j2 = await r2.json().catch(() => null);
    console.log(JSON.stringify(j2, null, 2));
  } catch (e) {
    console.error('fetch error', e);
  }
})();
