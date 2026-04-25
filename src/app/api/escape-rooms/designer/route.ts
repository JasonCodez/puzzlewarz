import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdminUser } from '@/lib/requireAdmin';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdminUser();
    if (!admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await req.json();
    // Destructure the designer config
    const { title, description, timeLimit, startMode, minTeamSize, playerMode, intro, outro, scenes, userSpecialties } = data;
    // For now, require a dummy puzzleId (should be replaced with real puzzle linkage)
    const dummyPuzzle = await prisma.puzzle.findFirst({ where: { isActive: false, puzzleType: 'escape_room' } })
      || await prisma.puzzle.findFirst();
    if (!dummyPuzzle) return NextResponse.json({ error: 'No puzzle found. Please create a puzzle first.' }, { status: 400 });
    const createData: any = {
      roomTitle: title,
      roomDescription: description,
      puzzleId: dummyPuzzle.id,
      minTeamSize: (typeof data.minTeamSize === 'number' && data.minTeamSize > 0) ? data.minTeamSize : 1,
      maxTeamSize: (typeof data.maxTeamSize === 'number' && data.maxTeamSize > 0) ? data.maxTeamSize : 8,
    };
    if (typeof timeLimit !== 'undefined' && timeLimit !== null) createData.timeLimitSeconds = Number(timeLimit);

    const escapeRoom = await prisma.escapeRoomPuzzle.create({
      data: createData,
    });
    // Create scenes (RoomLayout)
    for (const scene of scenes) {
      const layout = await prisma.roomLayout.create({
        data: {
          escapeRoomId: escapeRoom.id,
          title: scene.name,
          backgroundUrl: scene.backgroundUrl,
        },
      });
      // Create items (ItemDefinition)
      for (const item of scene.items) {
        await prisma.itemDefinition.create({
          data: {
            escapeRoomId: escapeRoom.id,
            key: item.id,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
          },
        });
      }
      // Create interactive zones (Hotspot)
      for (const zone of scene.interactiveZones) {
        await prisma.hotspot.create({
          data: {
            layoutId: layout.id,
            x: zone.x,
            y: zone.y,
            w: zone.width,
            h: zone.height,
            type: zone.actionType,
            targetId: zone.collectItemId || null,
            meta: JSON.stringify({
              zoneId: typeof zone?.id === 'string' ? zone.id : undefined,
              label: zone.label,
              modalContent: zone.modalContent,
              itemId: (zone as any).itemId,
              imageUrl: (zone as any).imageUrl,
              interactions: (zone as any).interactions,
              linkedPuzzleId: zone.linkedPuzzleId,
              eventId: zone.eventId,
              targetSceneId: (zone as any).targetSceneId,
              pickupAnimationPreset: (zone as any).pickupAnimationPreset,
              pickupAnimationUrl: (zone as any).pickupAnimationUrl,
              sfx: (zone as any).sfx || undefined,
              penaltySeconds: (zone as any).penaltySeconds || undefined,
              miniPuzzle: (zone as any).miniPuzzle || undefined,
              codeEntry: (zone as any).codeEntry || undefined,
              requiredItemId: (zone as any).requiredItemId,
              consumeItemOnUse: (zone as any).consumeItemOnUse,
              disabledByDefault: (zone as any).disabledByDefault,
              useEffect: (zone as any).useEffect,
              actionType: zone.actionType,
            }),
          },
        });
      }
      // Create triggers (RoomTrigger) for trigger zones
      for (const zone of (scene.interactiveZones.filter((z: any) => z.actionType === 'trigger'))) {
        await prisma.roomTrigger.create({
          data: {
            layoutId: layout.id,
            event: zone.eventId || '',
            action: 'trigger',
          },
        });
      }
    }

    // Persist full designer payload for runtime reconstruction (item positions, variants, foreground, etc).
    const puzzle = await prisma.puzzle.findUnique({ where: { id: dummyPuzzle.id }, select: { data: true } });
    const curData: any = puzzle?.data && typeof puzzle.data === 'object' ? puzzle.data : {};
    const nextData = {
      ...curData,
      escapeRoomData: {
        title,
        description,
        timeLimit,
        startMode: startMode || 'leader-start',
        minTeamSize: (typeof minTeamSize === 'number' && minTeamSize > 0) ? minTeamSize : 1,
        playerMode: playerMode || 'shared',
        intro: intro || undefined,
        outro: outro || undefined,
        scenes,
      },
    };
    await prisma.puzzle.update({
      where: { id: dummyPuzzle.id },
      data: {
        data: nextData,
        minTeamSize: (typeof minTeamSize === 'number' && minTeamSize > 0) ? minTeamSize : 1,
      },
    });

    // Optionally: Save userSpecialties (not implemented here)
    return NextResponse.json({ success: true, escapeRoomId: escapeRoom.id });
  } catch (error: any) {
    console.error('[ESCAPE ROOM DESIGNER CREATE] Failed to create escape room', error);
    return NextResponse.json({ error: 'Failed to create escape room' }, { status: 500 });
  }
}
