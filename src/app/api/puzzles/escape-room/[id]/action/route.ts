import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notification-service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const puzzleId = resolved.id;

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const { action, hotspotId } = body as { action?: string; hotspotId?: string };
    if (!action || !hotspotId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    // Resolve escapeRoom for this puzzle
    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId } });
    if (!escapeRoom) return NextResponse.json({ error: 'Escape room not found' }, { status: 404 });

    const hotspot = await prisma.hotspot.findUnique({ where: { id: hotspotId } });
    if (!hotspot || hotspot.layoutId == null) return NextResponse.json({ error: 'Hotspot not found' }, { status: 404 });

    if (action === 'pickup') {
      // If hotspot.targetId points to an ItemDefinition id, add item key to player state
      if (!hotspot.targetId) return NextResponse.json({ error: 'No item to pick up' }, { status: 400 });

      const item = await prisma.itemDefinition.findUnique({ where: { id: hotspot.targetId } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

      // Upsert player room state
      const prsWhere = { userId_escapeRoomId: { userId: user.id, escapeRoomId: escapeRoom.id } };
      const existing = await prisma.playerRoomState.findUnique({ where: prsWhere }).catch(() => null);

      let stateObj: any = {};
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

      // Create an in-app notification and activity log for the pickup
      (async () => {
        try {
          await createNotification({
            userId: user.id,
            type: "system",
            title: `Item Picked Up: ${item.name}`,
            message: `You picked up ${item.name}. It has been added to your inventory.`,
            icon: "🧭",
            relatedId: item.id,
          });

          try {
            await prisma.activity.create({
              data: {
                userId: user.id,
                type: "escape_pickup",
                title: `Picked up: ${item.name}`,
                description: `Picked up ${item.name} in ${escapeRoom.roomTitle}`,
                icon: "🧭",
                relatedId: item.id,
                relatedType: "item",
              },
            });
          } catch (actErr) {
            // non-fatal - log and continue
            console.error('Failed to create pickup activity:', actErr);
          }
        } catch (notifyErr) {
          // ignore notification failures
          console.error('Failed to send pickup notification:', notifyErr);
        }
      })();

      // Also notify team members and send a team-level socket event (non-blocking)
      (async () => {
        try {
          // Find the teams the user belongs to
          const memberships = await prisma.teamMember.findMany({ where: { userId: user.id } });
          for (const membership of memberships) {
            try {
              const members = await prisma.teamMember.findMany({ where: { teamId: membership.teamId } });
              const memberUserIds = members.map(m => m.userId).filter(id => id !== user.id);

              for (const memberUserId of memberUserIds) {
                try {
                  await createNotification({
                    userId: memberUserId,
                    type: "team_update",
                    title: `Teammate picked up ${item.name}`,
                    message: `${user.name || user.email} picked up ${item.name} in ${escapeRoom.roomTitle}`,
                    icon: "🧭",
                    relatedId: item.id,
                  });
                } catch (memberNotifyErr) {
                  console.error('Failed to notify team member', memberNotifyErr);
                }
              }

              // Push a team-level socket event if socket server configured
              try {
                const { postToSocket } = await import('@/lib/socket-client');
                await postToSocket('/team-event', {
                  teamId: membership.teamId,
                  event: 'pickup',
                  userId: user.id,
                  itemId: item.id,
                  itemName: item.name,
                  puzzleId,
                });
              } catch (socketErr) {
                // non-fatal
              }
            } catch (teamErr) {
              console.error('Failed processing team notifications for membership', teamErr);
            }
          }
        } catch (outerErr) {
          console.error('Failed to notify teams for pickup:', outerErr);
        }
      })();

      return NextResponse.json({ success: true, inventory: stateObj.inventory });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('Escape-room action failed:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
