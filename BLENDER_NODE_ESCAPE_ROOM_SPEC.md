# Blender Node Escape Room Spec

This document defines the first practical contract for a Blender-rendered, node-based 3D escape room in Puzzlewarz.

The goal is not real-time first-person 3D. The goal is a rendered-node experience where each node is a locked Blender camera shot with hotspots, stateful overlays, scene transitions, and puzzle interactions.

This spec is written to fit the current Puzzlewarz architecture rather than replace it:

- the designer already works with `scenes`, `items`, and `interactiveZones`
- the player runtime already renders a `backgroundUrl` plus layered items and hotspots
- the session model already has `sceneState` JSON for shared interaction state
- stage progression already uses `currentStageIndex`

For a node-based room, the correct move is to extend those surfaces, not to bolt on a separate 3D subsystem.

## 1. Exact Node Schema And JSON Shape

### 1.1 Core design decisions

1. A node is a scene.
2. Stage progression remains separate from node navigation.
3. `currentStageIndex` continues to represent puzzle progression.
4. `currentSceneId` becomes the active rendered node within the current stage.
5. In shared navigation mode, the whole team sees the same current node.
6. In per-player navigation mode, each player can have their own current node while still sharing inventory and puzzle state.
7. Navigation is expressed as a hotspot action, not as a separate graph structure.
8. Close-up renders are scenes too, usually with `sceneType: "inspect"`.

### 1.2 Root payload

Use this payload inside the escape-room designer data for a Blender node room:

```ts
type NodeExperienceType = "blender-node";
type NodeRenderMode = "fixed-node";
type NodeNavigationMode = "shared" | "perPlayer";
type NodeInventoryMode = "shared";

interface NodeCondition {
  allFlags?: string[];
  anyFlags?: string[];
  noneFlags?: string[];
}

interface BlenderNodeRenderProfile {
  baseWidth: number;
  baseHeight: number;
  aspectRatio: "16:9" | "21:9" | "4:3";
  masterFormat: "webp" | "jpg" | "png";
  overlayFormat: "png" | "webp";
  thumbnailFormat: "webp" | "jpg";
  colorSpace: "sRGB";
}

interface BlenderNodeVariant extends NodeCondition {
  id: string;
  label: string;
  backgroundUrl: string;
  foregroundUrl?: string;
}

interface BlenderNodeUseEffect {
  hideItemIds?: string[];
  showItemIds?: string[];
  disableHotspotIds?: string[];
  enableHotspotIds?: string[];
  setItemStateById?: Record<string, string>;
  setItemImageById?: Record<string, string>;
  setItemAlphaById?: Record<string, number>;
  setItemScaleById?: Record<string, number>;
  setItemRotationById?: Record<string, number>;
  setItemTintById?: Record<string, string>;
  grantFlags?: string[];
  clearFlags?: string[];
  crossSceneEffects?: Array<{
    sceneId: string;
    showItemIds?: string[];
    hideItemIds?: string[];
    enableHotspotIds?: string[];
    disableHotspotIds?: string[];
  }>;
  completesRoom?: boolean;
  completionVariant?: string;
}

type BlenderNodeHotspotAction =
  | "navigate"
  | "modal"
  | "collect"
  | "trigger"
  | "codeEntry"
  | "miniPuzzle"
  | "triggerItemAnimation";

interface BlenderNodeHotspot extends NodeCondition {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  actionType: BlenderNodeHotspotAction;
  hotspotStyle?: "nav" | "inspect" | "collect" | "trigger" | "hidden";
  targetSceneId?: string;
  returnSceneId?: string;
  transitionHint?: "fade" | "slideLeft" | "slideRight" | "slideUp" | "zoomIn" | "wipe" | "glitch";
  preloadTargets?: string[];
  consumeItemOnUse?: boolean;
  requiredItemId?: string;
  disabledByDefault?: boolean;
  itemId?: string;
  imageUrl?: string;
  modalContent?: string;
  interactions?: Array<{
    label: string;
    modalContent: string;
    imageUrl?: string;
    triggersEffect?: BlenderNodeUseEffect;
    completesRoom?: boolean;
    completionVariant?: string;
  }>;
  useEffect?: BlenderNodeUseEffect;
  eventId?: string;
  linkedPuzzleId?: string;
  collectItemId?: string;
  pickupAnimationPreset?: "cinematic" | "quickSpin" | "floatIn" | "powerDrop" | "spiral" | "bounce" | "glitch" | "flash";
  pickupAnimationUrl?: string;
  sfx?: {
    pickup?: string | { url: string; volume?: number };
    use?: string | { url: string; volume?: number };
    trigger?: string | { url: string; volume?: number };
    loot?: string | { url: string; volume?: number };
  };
  penaltySeconds?: number;
  miniPuzzle?: {
    type: "keypad" | "wire" | "dial";
    config: Record<string, unknown>;
  };
  codeEntry?: {
    correctCode: string;
    caseSensitive?: boolean;
    errorMessage?: string;
    cooldownSeconds?: number;
    maxAttempts?: number;
    displayItemId?: string;
  };
}

interface BlenderNodeScene {
  id: string;
  name: string;
  sceneType: "room" | "inspect" | "closeup";
  cameraName: string;
  thumbnailUrl: string;
  backgroundUrl: string;
  foregroundUrl?: string;
  description: string;
  items: Array<Record<string, unknown>>;
  interactiveZones: BlenderNodeHotspot[];
  accessRule?: "open" | "assignedOnly" | "lockedUntilUnlocked";
  transitionIn?: "none" | "fade" | "slideLeft" | "slideRight" | "slideUp" | "zoomIn" | "wipe" | "glitch";
  solveCelebration?: "none" | "confetti" | "flash" | "starburst" | "dramatic";
  bgm?: { url: string; volume?: number };
  enterSfx?: string;
  solveSfx?: string;
  tags?: string[];
  defaultReturnSceneId?: string | null;
  stateVariants?: BlenderNodeVariant[];
}

interface BlenderNodeRoomData {
  version: 1;
  experienceType: NodeExperienceType;
  renderMode: NodeRenderMode;
  navigationMode: NodeNavigationMode;
  inventoryMode: NodeInventoryMode;
  startSceneId: string;
  defaultReturnSceneId?: string | null;
  renderProfile: BlenderNodeRenderProfile;
  scenes: BlenderNodeScene[];
}
```

### 1.3 Session state contract

For the first milestone, do not add a new Prisma column. Extend the existing escape-room `sceneState` JSON with these keys:

```ts
interface BlenderNodeSessionState {
  currentSceneId?: string;
  currentSceneByUserId?: Record<string, string>;
  flags?: string[];
  hiddenItemIds?: string[];
  shownItemIds?: string[];
  disabledHotspotIds?: string[];
  enabledHotspotIds?: string[];
  itemStates?: Record<string, string>;
  itemImageOverrides?: Record<string, string>;
  itemAlphaOverrides?: Record<string, number>;
  itemScaleOverrides?: Record<string, number>;
  itemRotationOverrides?: Record<string, number>;
  itemTintOverrides?: Record<string, string>;
}
```

Rules:

1. `currentStageIndex` stays the source of truth for puzzle progression.
2. `sceneState.currentSceneId` is used when `navigationMode` is `shared`.
3. `sceneState.currentSceneByUserId[userId]` is used when `navigationMode` is `perPlayer`.
4. `sceneState.flags` drives background variants and conditional hotspot visibility.

### 1.4 Exact JSON example

A concrete example lives at `scripts/blender/node-room-manifest.example.json`.

This is the expected root shape:

```json
{
  "version": 1,
  "experienceType": "blender-node",
  "renderMode": "fixed-node",
  "navigationMode": "shared",
  "inventoryMode": "shared",
  "startSceneId": "foyer_wide",
  "defaultReturnSceneId": "foyer_wide",
  "renderProfile": {
    "baseWidth": 1920,
    "baseHeight": 1080,
    "aspectRatio": "16:9",
    "masterFormat": "webp",
    "overlayFormat": "png",
    "thumbnailFormat": "webp",
    "colorSpace": "sRGB"
  },
  "scenes": []
}
```

## 2. Blender Export Checklist And Naming Convention

### 2.1 Folder layout

Recommended publish layout under `public/content/escape-rooms/<roomSlug>/`:

```text
public/content/escape-rooms/<roomSlug>/
  manifest/
    node-room.<roomSlug>.json
  nodes/
    <sceneId>/
      node.<sceneId>.base.webp
      node.<sceneId>.thumb.webp
      node.<sceneId>.fg.png
      node.<sceneId>.variant.<variantId>.webp
      node.<sceneId>.inspect.<inspectId>.webp
  transitions/
    node.<fromSceneId>.to.<toSceneId>.webm
  audio/
    enter.<sceneId>.mp3
    bgm.<sceneId>.mp3
    sfx.<event>.mp3
```

### 2.2 Blender naming convention

Use these names inside Blender:

1. Camera: `CAM__<sceneId>`
2. Scene collection: `COL__NODE__<sceneId>`
3. Variant collection: `COL__VARIANT__<sceneId>__<variantId>`
4. Foreground overlay collection: `COL__FG__<sceneId>`
5. Inspect node collection: `COL__INSPECT__<sceneId>`

These names matter because they make export automation possible later.

### 2.3 Render checklist per node

Every published node should pass this checklist:

1. One locked camera per node.
2. Same output aspect ratio across the whole room.
3. Same color transform across the whole room.
4. Same resolution family across the whole room.
5. No baked-in navigation arrows.
6. No clue text so small that it requires zooming the browser.
7. Use inspect nodes for tiny labels, screens, or notes.
8. Keep one clear clickable silhouette for each navigable exit or interaction.
9. Keep hotspot targets away from the outer 4 percent screen margin.
10. Keep neighboring node camera language consistent so transitions feel logical.

### 2.4 Recommended render settings

Use these as the first production baseline:

1. Master render: 2560x1440
2. Published base render: 1920x1080 webp
3. Thumbnail render: 480x270 webp
4. Foreground overlays: transparent png
5. Close-up inspect renders: 1920x1080 webp
6. Color space: sRGB output
7. Compression target: background webp quality 80 to 86
8. Transition clips only when they add real value

### 2.5 File naming contract

Use these exact file patterns:

1. Base node render: `node.<sceneId>.base.webp`
2. Node thumbnail: `node.<sceneId>.thumb.webp`
3. Foreground overlay: `node.<sceneId>.fg.png`
4. Variant render: `node.<sceneId>.variant.<variantId>.webp`
5. Inspect render: `node.<sceneId>.inspect.<inspectId>.webp`
6. Transition clip: `node.<fromSceneId>.to.<toSceneId>.webm`
7. Manifest: `node-room.<roomSlug>.json`

### 2.6 Export workflow

The recommended authoring workflow is:

1. Build the room in Blender.
2. Define your node list before hotspot authoring.
3. Lock camera names to final scene ids.
4. Render all base nodes first.
5. Render inspect nodes second.
6. Render state variants third.
7. Export thumbnails last.
8. Build the manifest only after filenames are final.

## 3. Map Of Current Editor And Runtime Changes Needed

### 3.1 What already exists

The current system already gives you most of the runtime foundation:

1. Designer scenes with `backgroundUrl`, `items`, and `interactiveZones` in `src/app/escape-rooms/Designer.tsx`.
2. Runtime scene rendering with a background plus layered items in `src/components/puzzle/PixiRoom.tsx`.
3. Shared `sceneState` mutations, visibility toggles, and cross-scene effects in the current escape-room flow.
4. Escape-room session state endpoints and action endpoints.
5. A validation script at `scripts/validate-escape-room-wiring.ts`.

### 3.2 What must change in the designer

File: `src/app/escape-rooms/Designer.tsx`

Add these editor features:

1. Experience type selector with `classic` and `blender-node`.
2. Start scene selector.
3. Navigation mode selector with `shared` and `perPlayer`.
4. Per-scene fields for `sceneType`, `cameraName`, `thumbnailUrl`, `foregroundUrl`, `defaultReturnSceneId`, and `stateVariants`.
5. Hotspot action type `navigate`.
6. Destination scene picker for `navigate` hotspots.
7. Conditional visibility editor for hotspots and variants using `allFlags`, `anyFlags`, and `noneFlags`.
8. Variant manager for alternate background renders.
9. Node graph panel showing inbound and outbound links.
10. Manifest import helper that can pre-seed scene ids, thumbnails, and background URLs from a Blender export.

### 3.3 What must change in the player runtime

File: `src/components/puzzle/EscapeRoomPuzzle.tsx`

Add these runtime changes:

1. Resolve active scene by `sceneState.currentSceneId` or `sceneState.currentSceneByUserId[userId]` instead of only by stage.
2. Keep node navigation separate from stage progression.
3. Add a `navigate` action handler for hotspots.
4. Preload the current node plus adjacent `preloadTargets`.
5. Resolve scene background variants from `sceneState.flags`.
6. Support a `returnSceneId` flow for inspect scenes.
7. Keep inventory, code-entry, and mini-puzzle behavior unchanged unless a node-specific override is needed.
8. In shared mode, broadcast node changes to the room socket channel.
9. In per-player mode, do not broadcast node changes as the team scene.

File: `src/components/puzzle/PixiRoom.tsx`

Add these rendering changes:

1. Optional `foregroundUrl` render layer above the base background and below hotspot chrome.
2. Background variant swapping without reloading the entire puzzle page.
3. Neighbor-scene texture preloading.
4. Hotspot styling by `hotspotStyle` so navigation targets look different from collect or trigger targets.
5. Transition handling tuned for node navigation rather than stage completion only.

### 3.4 What must change in the API layer

Files:

- `src/app/api/escape-rooms/designer/route.ts`
- `src/app/api/escape-rooms/designer/[id]/route.ts`
- `src/app/api/puzzles/escape-room/[id]/action/route.ts`
- `src/app/api/puzzles/escape-room/[id]/state/route.ts`

Required changes:

1. Persist the new node-room fields in the designer payload.
2. Validate `startSceneId` and `targetSceneId` references on save.
3. Add `action: "navigate"` to the escape-room action route.
4. Update `sceneState.currentSceneId` or `sceneState.currentSceneByUserId` on navigate.
5. Return the resolved current scene in the state payload.
6. Preserve `currentStageIndex` as the progression gate for actual puzzle advancement.

### 3.5 What must change in validation

File: `scripts/validate-escape-room-wiring.ts`

Add these checks:

1. `startSceneId` exists.
2. Every `navigate` hotspot points to a real scene id.
3. Every inspect scene has a return path.
4. Every scene is reachable from the start scene unless explicitly marked unreachable.
5. No required progression flag is impossible to acquire.
6. Every variant file path exists.
7. Every thumbnail exists.
8. Every referenced `foregroundUrl` exists.

### 3.6 Data-model recommendation

For the first milestone:

1. Do not change Prisma.
2. Store node-room metadata in the existing designer JSON.
3. Store navigation state in `sceneState` JSON.

This keeps the implementation small and reversible.

If later you need analytics on node dwell time, abandoned nodes, or per-node funnels, add first-class tables after the model proves itself.

## Recommended build order

Implement this in the following order:

1. Save format support in the designer.
2. Runtime support for `currentSceneId` and `navigate` hotspots.
3. Validation for link integrity and reachability.
4. Variant backgrounds and flag-based visibility.
5. Manifest import from Blender exports.
6. Per-player node navigation if you actually need split exploration.

## What not to build first

Do not start with:

1. A real-time 3D engine.
2. First-person movement.
3. 360 drag camera.
4. Procedural pathfinding between nodes.
5. Video transitions for every node hop.

The fixed-node rendered approach is the shortest path to a high-quality 3D-feeling escape room in this codebase.