# Blender Starter Kit

These scripts generate a small procedural asset set and a simple staging room for Blender-rendered Puzzlewarz escape rooms.

For the full node-based room contract, export rules, and editor/runtime changes, read `BLENDER_NODE_ESCAPE_ROOM_SPEC.md`.

## Files

- `starter_room_shell.py`: builds a camera-ready room shell with lights and prop placeholders.
- `escape_room_asset_pack.py`: builds a security door, keypad, desk, vent, wall sconce, and evidence board.
- `node-room-manifest.example.json`: sample manifest shape for a Blender-rendered node room.

## How To Run In Blender

1. Open Blender.
2. Switch to the `Scripting` workspace.
3. Open `starter_room_shell.py` and click `Run Script`.
4. Open `escape_room_asset_pack.py` and click `Run Script`.
5. Tweak the generated objects, then render your final room background.

## What To Edit First

- Move the generated assets from the lineup into the room shell.
- Change material colors to match the room theme.
- Add decals, grime, cables, labels, and scene clutter by hand.
- Duplicate or reshape the base assets instead of rebuilding from scratch.

## Suggested Workflow For Puzzlewarz

1. Use `starter_room_shell.py` to lock a camera angle.
2. Use `escape_room_asset_pack.py` to create starting props.
3. Arrange props in the room.
4. Render one clean background image.
5. Render optional transparent prop variants for opened drawers, lit screens, hidden notes, or unlocked doors.
6. Import those renders into the Puzzlewarz escape-room designer as scene backgrounds and overlay items.

## Good First Variants

- Door locked / unlocked
- Keypad dark / glowing / accepted
- Desk clean / drawer open
- Vent closed / removed grate
- Evidence board blank / clue-filled

## Notes

- Both scripts recreate their own collection each time they run, so rerunning them replaces the previous generated objects in that collection.
- The generated models are intentionally simple and editable. They are a starting point, not final hero assets.