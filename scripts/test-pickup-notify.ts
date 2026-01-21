import "dotenv/config";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notification-service";

async function main() {
  const args = process.argv.slice(2);
  const puzzleId = args[0] || "cmkniucb00002m1n0i8mwkyef";
  const hotspotIdArg = args[1];
  const userEmailArg = args[2];

  console.log(`Running pickup test for puzzleId=${puzzleId} hotspotId=${hotspotIdArg || '<auto>'}`);

  const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({
    where: { puzzleId },
    include: { layouts: { include: { hotspots: true } } },
  });
  if (!escapeRoom) {
    console.error('Escape room not found for puzzleId', puzzleId);
    process.exit(2);
  }

  // pick hotspot
  let hotspot;
  if (hotspotIdArg) {
    hotspot = await prisma.hotspot.findUnique({ where: { id: hotspotIdArg } });
  } else {
    for (const layout of escapeRoom.layouts) {
      hotspot = layout.hotspots.find(h => !!h.targetId) || layout.hotspots[0];
      if (hotspot) break;
    }
  }

  if (!hotspot) {
    console.error('No hotspot found for escape room');
    process.exit(3);
  }

  const item = hotspot.targetId ? await prisma.itemDefinition.findUnique({ where: { id: hotspot.targetId } }) : null;
  if (!item) {
    console.error('No item linked to hotspot (targetId missing or item not found)');
    process.exit(4);
  }

  // choose a user
  let user;
  if (userEmailArg) {
    user = await prisma.user.findUnique({ where: { email: userEmailArg } });
  }
  if (!user) user = await prisma.user.findFirst({ where: { email: { not: null } } });
  if (!user) {
    console.error('No user found in DB to run test as');
    process.exit(5);
  }

  console.log(`Simulating pickup as user ${user.email} (${user.id}) picking item ${item.name} (${item.id})`);

  // emulate pickup: try upserting playerRoomState; fallback to user_escape_progress if table missing
  let stateObj: any = {};
  try {
    const prsWhere = { userId_escapeRoomId: { userId: user.id, escapeRoomId: escapeRoom.id } } as any;
    const existing = await prisma.playerRoomState.findUnique({ where: prsWhere }).catch(() => null);
    if (existing && existing.state) {
      try { stateObj = JSON.parse(existing.state); } catch (e) { stateObj = {}; }
    }
    stateObj.inventory = stateObj.inventory || [];
    if (!stateObj.inventory.includes(item.key)) stateObj.inventory.push(item.key);

    await prisma.playerRoomState.upsert({
      where: prsWhere,
      update: { state: JSON.stringify(stateObj) },
      create: { userId: user.id, escapeRoomId: escapeRoom.id, state: JSON.stringify(stateObj) },
    });

    console.log('PlayerRoomState upserted. Inventory now:', stateObj.inventory);
  } catch (e: any) {
    console.warn('player_room_states table missing or upsert failed, falling back to user_escape_progress:', e?.message || e);
    // Fallback: upsert into user_escape_progress.inventory (stringified JSON array)
    const uepWhere = { userId_escapeRoomId: { userId: user.id, escapeRoomId: escapeRoom.id } } as any;
    const existingUep = await prisma.userEscapeProgress.findUnique({ where: uepWhere }).catch(() => null);
    let inventory: string[] = [];
    if (existingUep && existingUep.inventory) {
      try { inventory = JSON.parse(existingUep.inventory); } catch { inventory = []; }
    }
    if (!inventory.includes(item.key)) inventory.push(item.key);
    const uepData = { inventory: JSON.stringify(inventory) } as any;
    await prisma.userEscapeProgress.upsert({
      where: uepWhere,
      update: uepData,
      create: { userId: user.id, escapeRoomId: escapeRoom.id, inventory: JSON.stringify(inventory) },
    });
    stateObj.inventory = inventory;
    console.log('UserEscapeProgress upserted. Inventory now:', inventory);
  }

  // create in-app notification
  const notification = await createNotification({
    userId: user.id,
    type: 'system',
    title: `Item Picked Up: ${item.name}`,
    message: `You picked up ${item.name}.`,
    icon: '🧭',
    relatedId: item.id,
  });

  console.log('Notification created:', notification ? notification.id : 'failed');

  // create activity
  try {
    const activity = await prisma.activity.create({
      data: {
        userId: user.id,
        type: 'escape_pickup',
        title: `Picked up: ${item.name}`,
        description: `Picked up ${item.name} in ${escapeRoom.roomTitle}`,
        icon: '🧭',
        relatedId: item.id,
        relatedType: 'item',
      },
    });
    console.log('Activity created:', activity.id);
  } catch (e) {
    console.error('Failed to create activity', e);
  }

  // attempt socket POST
  try {
    const socketUrl = process.env.SOCKET_URL || process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';
    const resp = await fetch(`${socketUrl}/team-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        teamIds: [], // optional; we won't lookup teams here in test
        event: 'pickup',
        userId: user.id,
        itemId: item.id,
        itemName: item.name,
        puzzleId,
      }),
    }).catch(() => null);
    console.log('Socket POST attempted to', socketUrl, 'status:', resp ? resp.status : 'no-response');
  } catch (e) {
    console.error('Socket POST failed', e);
  }

  // verify notifications count for item
  const notifs = await prisma.notification.findMany({ where: { relatedId: item.id }, orderBy: { createdAt: 'desc' }, take: 5 });
  console.log(`Found ${notifs.length} notifications related to item ${item.id}`);

  console.log('Test complete.');
}

main().catch((e) => {
  console.error('Test script failed:', e);
  process.exit(1);
});
