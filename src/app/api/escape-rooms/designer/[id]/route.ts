import { PrismaClient } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

const prisma = new PrismaClient();

// GET: Fetch full escape room config for editing
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const escapeRoom = await prisma.escapeRoomPuzzle.findUnique({
      where: { id },
      include: {
        layouts: {
          include: {
            hotspots: true,
            triggers: true,
          },
        },
        itemDefinitions: true,
      },
    });
    if (!escapeRoom) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    // Map DB structure to designer format
    const scenes = (escapeRoom.layouts || []).map(layout => ({
      id: layout.id,
      name: layout.title || '',
      backgroundUrl: layout.backgroundUrl || '',
      description: '',
      items: (escapeRoom.itemDefinitions || []).map(item => ({
        id: item.key,
        name: item.name,
        imageUrl: item.imageUrl || '',
        description: item.description || '',
        properties: {},
      })),
      interactiveZones: (layout.hotspots || []).map(zone => {
        let meta: any = {};
        try { meta = zone.meta ? JSON.parse(zone.meta) : {}; } catch {}
        return {
          id: zone.id,
          label: typeof meta.label === 'string' ? meta.label : '',
          x: zone.x,
          y: zone.y,
          width: zone.w,
          height: zone.h,
          actionType: zone.type,
          modalContent: typeof meta.modalContent === 'string' ? meta.modalContent : '',
          linkedPuzzleId: typeof meta.linkedPuzzleId === 'string' ? meta.linkedPuzzleId : undefined,
          eventId: typeof meta.eventId === 'string' ? meta.eventId : undefined,
          collectItemId: zone.targetId,
        };
      }),
    }));
    const er: any = escapeRoom;
    return NextResponse.json({
      title: er.roomTitle,
      description: er.roomDescription,
      minPlayers: er.minTeamSize,
      maxPlayers: er.maxTeamSize,
      timeLimit: er.timeLimitSeconds,
      scenes,
      userSpecialties: [], // Not implemented yet
    });
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || String(error), stack: (error as any)?.stack }, { status: 500 });
  }
}

// PUT: Update escape room config
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { id, title, description, minPlayers, maxPlayers, timeLimit, scenes, userSpecialties } = data;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    // Update main room
    const updateData: any = {
      roomTitle: title,
      roomDescription: description,
    };
    if (typeof minPlayers !== 'undefined' && minPlayers !== null) updateData.minTeamSize = Number(minPlayers);
    if (typeof maxPlayers !== 'undefined' && maxPlayers !== null) updateData.maxTeamSize = Number(maxPlayers);
    if (typeof timeLimit !== 'undefined' && timeLimit !== null) updateData.timeLimitSeconds = Number(timeLimit);

    await prisma.escapeRoomPuzzle.update({
      where: { id },
      data: updateData,
    });
    // For simplicity: delete all layouts/items/hotspots/triggers and recreate (can optimize later)
    await prisma.roomLayout.deleteMany({ where: { escapeRoomId: id } });
    await prisma.itemDefinition.deleteMany({ where: { escapeRoomId: id } });
    // Recreate scenes, items, zones, triggers
    for (const scene of scenes) {
      const layout = await prisma.roomLayout.create({
        data: {
          escapeRoomId: id,
          title: scene.name,
          backgroundUrl: scene.backgroundUrl,
        },
      });
      for (const item of scene.items) {
        await prisma.itemDefinition.create({
          data: {
            escapeRoomId: id,
            key: item.id,
            name: item.name,
            description: item.description,
            imageUrl: item.imageUrl,
          },
        });
      }
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
              label: zone.label,
              modalContent: zone.modalContent,
              linkedPuzzleId: zone.linkedPuzzleId,
              eventId: zone.eventId,
            }),
          },
        });
      }
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
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as any)?.message || String(error), stack: (error as any)?.stack }, { status: 500 });
  }
}
