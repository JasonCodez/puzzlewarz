import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notification-service";
import { requireEscapeRoomTeamContext } from "@/lib/escapeRoomTeamAuth";

function safeJsonParse<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== "string") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function emitEscapeSession(teamId: string, puzzleId: string, payload: any) {
  try {
    const { postToSocket } = await import("@/lib/socket-client");
    const room = `escape:${teamId}::${puzzleId}`;
    await postToSocket("/emit", { room, event: "escapeSessionUpdated", payload });
  } catch {
    // non-fatal
  }
}

async function emitEscapeActivity(teamId: string, puzzleId: string, payload: any) {
  try {
    const { postToSocket } = await import("@/lib/socket-client");
    const room = `escape:${teamId}::${puzzleId}`;
    await postToSocket("/emit", { room, event: "escapeActivity", payload });
  } catch {
    // non-fatal
  }
}

function makeActivityId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> } | { params: { id: string } }
) {
  try {
    const resolved = params instanceof Promise ? await params : params;
    const puzzleId = resolved.id;

    const body = await request.json().catch(() => ({}));
    const { action, hotspotId, teamId } = body as { action?: string; hotspotId?: string; teamId?: string };
    if (!action || !hotspotId) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

    const ctx = await requireEscapeRoomTeamContext(request, puzzleId, { teamId });
    if (ctx instanceof NextResponse) return ctx;

    const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { id: true, name: true, email: true } });
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Resolve escapeRoom for this puzzle
    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({ where: { puzzleId } });
    if (!escapeRoom) return NextResponse.json({ error: 'Escape room not found' }, { status: 404 });

    const hotspot = await prisma.hotspot.findUnique({
      where: { id: hotspotId },
      include: { layout: { select: { escapeRoomId: true } } },
    });
    if (!hotspot) return NextResponse.json({ error: 'Hotspot not found' }, { status: 404 });
    if (hotspot.layout.escapeRoomId !== escapeRoom.id) {
      return NextResponse.json({ error: 'Hotspot not part of this escape room' }, { status: 403 });
    }

    // Block actions unless a run is actively started (prevents door opens/pickups during briefing).
    const progress = await (prisma as any).teamEscapeProgress.findUnique({
      where: { teamId_escapeRoomId: { teamId: ctx.teamId, escapeRoomId: escapeRoom.id } },
      select: {
        inventory: true,
        currentStageIndex: true,
        solvedStages: true,
        runStartedAt: true,
        failedAt: true,
        completedAt: true,
      },
    });

    if (!progress) {
      return NextResponse.json(
        { error: 'Escape room has not been started for this team. Start from the team lobby.' },
        { status: 409 }
      );
    }
    if (!progress.runStartedAt) {
      return NextResponse.json({ error: 'The run has not started yet.' }, { status: 409 });
    }
    if (progress.completedAt) {
      return NextResponse.json({ error: 'This escape room run is already complete.' }, { status: 409 });
    }
    if (progress.failedAt) {
      return NextResponse.json({ error: 'This escape room run has already failed and cannot be retried.' }, { status: 409 });
    }

    if (action === 'pickup') {
      // If hotspot.targetId points to an ItemDefinition id, add item key to player state
      if (!hotspot.targetId) return NextResponse.json({ error: 'No item to pick up' }, { status: 400 });

      const item = await prisma.itemDefinition.findUnique({ where: { id: hotspot.targetId } });
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
      if (item.escapeRoomId !== escapeRoom.id) {
        return NextResponse.json({ error: 'Item not part of this escape room' }, { status: 403 });
      }

      let inventory: string[] = [];
      try {
        inventory = progress?.inventory ? JSON.parse(progress.inventory) : [];
        if (!Array.isArray(inventory)) inventory = [];
      } catch {
        inventory = [];
      }

      if (!inventory.includes(item.key)) inventory.push(item.key);

      await (prisma as any).teamEscapeProgress.update({
        where: { teamId_escapeRoomId: { teamId: ctx.teamId, escapeRoomId: escapeRoom.id } },
        data: { inventory: JSON.stringify(inventory) },
      });

      // Provide item metadata for inventory rendering.
      let inventoryItems: Record<string, { id: string; key: string; name: string; imageUrl: string | null }> = {};
      try {
        const defs = await prisma.itemDefinition.findMany({
          where: { escapeRoomId: escapeRoom.id, key: { in: inventory } },
          select: { id: true, key: true, name: true, imageUrl: true },
        });
        inventoryItems = Object.fromEntries(defs.map((d) => [d.key, d]));
      } catch {
        inventoryItems = {};
      }

      // Let the team UI update inventory quickly (non-blocking)
      await emitEscapeSession(ctx.teamId, puzzleId, {
        teamId: ctx.teamId,
        puzzleId,
        inventory,
        inventoryItems,
      });

      // Real-time team activity feed (non-blocking)
      await emitEscapeActivity(ctx.teamId, puzzleId, {
        teamId: ctx.teamId,
        puzzleId,
        entry: {
          id: makeActivityId(),
          ts: new Date().toISOString(),
          type: 'pickup',
          title: `Picked up: ${item.name}`,
          actor: { id: user.id, name: user.name || user.email || 'Teammate' },
          meta: { itemId: item.id, itemKey: item.key },
        },
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
          const members = await prisma.teamMember.findMany({ where: { teamId: ctx.teamId } });
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
              teamId: ctx.teamId,
              event: 'pickup',
              userId: user.id,
              itemId: item.id,
              itemName: item.name,
              puzzleId,
            });
          } catch (socketErr) {
            // non-fatal
          }
        } catch (outerErr) {
          console.error('Failed to notify teams for pickup:', outerErr);
        }
      })();

      return NextResponse.json({
        success: true,
        inventory,
        inventoryItems,
        pickedUp: { id: item.id, key: item.key, name: item.name, imageUrl: item.imageUrl ?? null },
      });
    }

    if (action === 'trigger') {
      // Trigger/door hotspot: advance rooms or complete the run.
      const meta = safeJsonParse<Record<string, any>>(hotspot.meta, {});

      let inventory: string[] = [];
      try {
        inventory = progress?.inventory ? JSON.parse(progress.inventory) : [];
        if (!Array.isArray(inventory)) inventory = [];
      } catch {
        inventory = [];
      }

      // Optional gating: require items to be present in inventory
      const requiresItems: string[] = Array.isArray(meta.requiresItems) ? meta.requiresItems.filter((x: any) => typeof x === 'string') : [];
      if (requiresItems.length > 0) {
        const missing = requiresItems.filter((k) => !inventory.includes(k));
        if (missing.length > 0) {
          return NextResponse.json({ error: `Missing required item(s): ${missing.join(', ')}` }, { status: 409 });
        }
      }

      // Determine total rooms/scenes so we can decide whether this is the final door.
      let totalRooms = 0;
      try {
        const puzzle = await prisma.puzzle.findUnique({ where: { id: puzzleId } });
        const pAny: any = puzzle;
        const escapeRoomData = pAny?.data && typeof pAny.data === 'object' && 'escapeRoomData' in pAny.data ? pAny.data.escapeRoomData : null;
        if (escapeRoomData && Array.isArray(escapeRoomData.scenes)) {
          totalRooms = escapeRoomData.scenes.length;
        }
      } catch {
        // ignore
      }
      if (!totalRooms) {
        try {
          totalRooms = await prisma.roomLayout.count({ where: { escapeRoomId: escapeRoom.id } });
        } catch {
          totalRooms = 0;
        }
      }

      const cur = Math.max(1, Number(progress.currentStageIndex || 1));
      const nextFromMeta = typeof meta.nextStageIndex === 'number'
        ? meta.nextStageIndex
        : (typeof meta.nextStageOrder === 'number' ? meta.nextStageOrder : null);
      const advanceBy = typeof meta.advanceBy === 'number' && Number.isFinite(meta.advanceBy) ? meta.advanceBy : 1;
      const requestedNext = nextFromMeta ?? (cur + advanceBy);

      const isComplete = Boolean(meta.complete) || meta.eventId === 'complete' || (totalRooms > 0 && requestedNext > totalRooms);
      const nextStageIndex = isComplete ? (totalRooms || cur) : Math.max(1, Math.floor(requestedNext));

      let solvedStages: number[] = [];
      try {
        solvedStages = progress?.solvedStages ? JSON.parse(progress.solvedStages) : [];
        if (!Array.isArray(solvedStages)) solvedStages = [];
      } catch {
        solvedStages = [];
      }
      if (!solvedStages.includes(nextStageIndex)) solvedStages.push(nextStageIndex);
      solvedStages.sort((a, b) => a - b);

      const updated = await (prisma as any).teamEscapeProgress.update({
        where: { teamId_escapeRoomId: { teamId: ctx.teamId, escapeRoomId: escapeRoom.id } },
        data: {
          currentStageIndex: nextStageIndex,
          solvedStages: JSON.stringify(solvedStages),
          completedAt: isComplete ? new Date() : undefined,
        },
        select: { currentStageIndex: true, solvedStages: true, completedAt: true },
      });

      await emitEscapeSession(ctx.teamId, puzzleId, {
        teamId: ctx.teamId,
        puzzleId,
        currentStageIndex: updated.currentStageIndex,
        solvedStages: updated.solvedStages,
        completedAt: updated.completedAt,
      });

      const triggerLabel =
        (typeof meta.label === 'string' && meta.label.trim())
          ? meta.label.trim()
          : (isComplete ? 'Escape Complete' : 'Door Opened');

      await emitEscapeActivity(ctx.teamId, puzzleId, {
        teamId: ctx.teamId,
        puzzleId,
        entry: {
          id: makeActivityId(),
          ts: new Date().toISOString(),
          type: isComplete ? 'complete' : 'trigger',
          title: isComplete
            ? 'Completed the escape room'
            : `Advanced to stage ${nextStageIndex}`,
          actor: { id: user.id, name: user.name || user.email || 'Teammate' },
          meta: {
            label: triggerLabel,
            nextStageIndex,
            completed: isComplete,
            hotspotId,
          },
        },
      });

      return NextResponse.json({
        success: true,
        currentStageIndex: updated.currentStageIndex,
        solvedStages: updated.solvedStages,
        completedAt: updated.completedAt,
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    console.error('Escape-room action failed:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
