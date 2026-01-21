"use client";

import React, { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";

type Hotspot = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: string;
  meta?: string | null;
};

export default function PixiRoom({
  puzzleId,
  layout,
  hotspots,
  onHotspotAction,
}: {
  puzzleId: string;
  layout: { id: string; title?: string | null; backgroundUrl?: string | null; width?: number | null; height?: number | null } | null;
  hotspots: Hotspot[];
  onHotspotAction: (hotspotId: string) => Promise<void> | void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<PIXI.Application | null>(null);

  useEffect(() => {
    if (!containerRef.current || !layout) return;

    const app = new PIXI.Application({
      backgroundAlpha: 0,
      resizeTo: containerRef.current,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    appRef.current = app;
    containerRef.current.appendChild(app.view as HTMLCanvasElement);

    let bgSprite: PIXI.Sprite | null = null;

    const draw = () => {
      app.stage.removeChildren();

      // background
      if (layout.backgroundUrl) {
        const tex = PIXI.Texture.from(layout.backgroundUrl);
        bgSprite = new PIXI.Sprite(tex);
        // Fit background to layout while preserving aspect
        const layoutW = layout.width || 800;
        const layoutH = layout.height || 600;
        const targetW = app.renderer.width;
        const targetH = app.renderer.height;
        const sx = targetW / layoutW;
        const sy = targetH / layoutH;
        const scale = Math.min(sx, sy);
        bgSprite.width = layoutW * scale;
        bgSprite.height = layoutH * scale;
        bgSprite.x = (targetW - bgSprite.width) / 2;
        bgSprite.y = (targetH - bgSprite.height) / 2;
        app.stage.addChild(bgSprite);
      }

      // hotspots
      for (const hs of hotspots || []) {
        const g = new PIXI.Graphics();
        // transparent fill to capture events
        g.beginFill(0xffffff, 0.001);
        // map layout coords to canvas coords
        const layoutW = layout.width || 800;
        const layoutH = layout.height || 600;
        const targetW = app.renderer.width;
        const targetH = app.renderer.height;
        const sx = targetW / layoutW;
        const sy = targetH / layoutH;
        const scale = Math.min(sx, sy);
        const x = (targetW - layoutW * scale) / 2 + hs.x * scale;
        const y = (targetH - layoutH * scale) / 2 + hs.y * scale;
        const w = hs.w * scale;
        const h = hs.h * scale;
        g.drawRect(x, y, w, h);
        g.endFill();
        g.interactive = true;
        g.cursor = "pointer";

        // debug outline
        const outline = new PIXI.Graphics();
        outline.lineStyle(2, 0xffff66, 0.7);
        outline.drawRect(x, y, w, h);
        outline.endFill();
        outline.alpha = 0.0; // hide by default
        app.stage.addChild(outline);

        g.on("pointerover", () => { outline.alpha = 1.0; });
        g.on("pointerout", () => { outline.alpha = 0.0; });
        g.on("pointerdown", async () => {
          try {
            await onHotspotAction(hs.id);
          } catch (e) {
            console.error('Hotspot action error', e);
          }
        });

        app.stage.addChild(g);
      }
    };

    draw();

    const resizeObserver = new ResizeObserver(() => {
      draw();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (appRef.current) {
        appRef.current.destroy(true, { children: true });
        appRef.current = null;
      }
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [layout, hotspots, puzzleId, onHotspotAction]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 300 }} />
  );
}
