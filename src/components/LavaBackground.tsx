"use client";

import { useEffect, useRef } from "react";

/**
 * Animated lava background using Canvas2D + requestAnimationFrame.
 * Domain-warped turbulence creates organic, flowing molten rock.
 */
export default function LavaBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let t = 0;
    let W = 0;
    let H = 0;
    // Offscreen canvas for low-res render before scaling
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d")!;

    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const SCALE = isMobile ? 4 : 3;
    const FRAME_MS = isMobile ? 33 : 0; // ~30fps on mobile
    let lastFrame = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      W = parent.clientWidth  || parent.offsetWidth  || 400;
      H = parent.clientHeight || parent.offsetHeight || 600;
      canvas!.width  = W;
      canvas!.height = H;
      offscreen.width  = Math.ceil(W / SCALE);
      offscreen.height = Math.ceil(H / SCALE);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // â”€â”€ Smooth lerp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const lerp = (a: number, b: number, f: number) => a + (b - a) * Math.max(0, Math.min(1, f));

    // â”€â”€ Domain-warped turbulence â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Multiple octaves of sine waves + secondary warped layer = organic lava
    function turbulence(px: number, py: number, time: number): number {
      // Layer 1: broad slow flow (horizontal drift)
      const v1 = Math.sin(px * 0.009 + time * 0.38) * 0.22
               + Math.sin(py * 0.011 - time * 0.26) * 0.18
               + Math.sin((px + py) * 0.007 + time * 0.48) * 0.16;

      // Layer 2: detail cracks
      const v2 = Math.sin(px * 0.018 - py * 0.013 + time * 0.62) * 0.14
               + Math.sin(px * 0.005 + py * 0.022 - time * 0.31) * 0.10;

      // Domain warp: distort layer 3 coordinates using layer 1+2 output
      const warpX = px + Math.sin(py  * 0.008 + time * 0.34) * 55;
      const warpY = py + Math.cos(px  * 0.007 - time * 0.29) * 45;
      const v3 = Math.sin(warpX * 0.009 + warpY * 0.007 + time * 0.44) * 0.20;

      // Combine and map from [-0.8..0.8] â†’ [0..1]
      const sum = v1 + v2 + v3;
      return sum * 0.625 + 0.5; // normalize
    }

    // â”€â”€ Lava colour ramp â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // 0.00 â†’ 0.28 : black volcanic rock
    // 0.28 â†’ 0.48 : dark red cooling crust
    // 0.48 â†’ 0.65 : deep orange, first melt
    // 0.65 â†’ 0.80 : bright orange
    // 0.80 â†’ 0.92 : yellow-orange, hot channel
    // 0.92 â†’ 1.00 : white-hot core
    function lavaRGB(v: number): [number, number, number] {
      if (v < 0.28) {
        const f = v / 0.28;
        return [lerp(4, 28, f), lerp(1, 5, f), lerp(1, 3, f)];
      } else if (v < 0.48) {
        const f = (v - 0.28) / 0.20;
        return [lerp(28, 130, f), lerp(5, 12, f), lerp(3, 5, f)];
      } else if (v < 0.65) {
        const f = (v - 0.48) / 0.17;
        return [lerp(130, 215, f), lerp(12, 50, f), lerp(5, 6, f)];
      } else if (v < 0.80) {
        const f = (v - 0.65) / 0.15;
        return [lerp(215, 255, f), lerp(50, 112, f), lerp(6, 8, f)];
      } else if (v < 0.92) {
        const f = (v - 0.80) / 0.12;
        return [255, lerp(112, 210, f), lerp(8, 20, f)];
      } else {
        const f = (v - 0.92) / 0.08;
        return [255, lerp(210, 255, f), lerp(20, 180, f)];
      }
    }

    // â”€â”€ Main render loop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    function draw(now: number) {
      if (FRAME_MS && now - lastFrame < FRAME_MS) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      lastFrame = now;

      if (W === 0 || H === 0) {
        resize();
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const cols = offscreen.width;
      const rows = offscreen.height;
      const imgData = offCtx.createImageData(cols, rows);
      const d = imgData.data;

      for (let py = 0; py < rows; py++) {
        for (let px = 0; px < cols; px++) {
          const v = turbulence(px * SCALE, py * SCALE, t);
          const [r, g, b] = lavaRGB(v);
          const i = (py * cols + px) * 4;
          d[i]     = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Upscale with bilinear smoothing â€” eliminates pixelation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, W, H);

      t += 0.022; // animation speed â€” tweak here
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}
