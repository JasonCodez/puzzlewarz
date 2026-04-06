"use client";

import { useEffect, useRef } from "react";

/**
 * Animated neon/cyberpunk background using Canvas2D.
 * Pulsing neon grid lines over dark surface with glowing plasma.
 */
export default function NeonBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let t = 0;
    let W = 0;
    let H = 0;
    const offscreen = document.createElement("canvas");
    const offCtx = offscreen.getContext("2d")!;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const SCALE = isMobile ? 4 : 3;
    const FRAME_MS = isMobile ? 33 : 0;
    let lastFrame = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      W = parent.clientWidth || parent.offsetWidth || 400;
      H = parent.clientHeight || parent.offsetHeight || 600;
      canvas!.width = W;
      canvas!.height = H;
      offscreen.width = Math.ceil(W / SCALE);
      offscreen.height = Math.ceil(H / SCALE);
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    const lerp = (a: number, b: number, f: number) =>
      a + (b - a) * Math.max(0, Math.min(1, f));

    // Neon plasma — swirling cyan/magenta energy field
    function plasma(px: number, py: number, time: number): number {
      const v1 =
        Math.sin(px * 0.008 + time * 0.30) * 0.20 +
        Math.sin(py * 0.010 + time * 0.25) * 0.18 +
        Math.sin((px + py) * 0.006 - time * 0.35) * 0.14;

      const v2 =
        Math.sin(px * 0.020 - py * 0.015 + time * 0.50) * 0.13 +
        Math.sin(px * 0.012 + py * 0.018 - time * 0.22) * 0.09;

      // Warp for electric distortion
      const wX = px + Math.sin(py * 0.009 + time * 0.40) * 40;
      const wY = py + Math.cos(px * 0.008 - time * 0.32) * 35;
      const v3 = Math.sin(wX * 0.010 + wY * 0.008 + time * 0.38) * 0.18;

      const sum = v1 + v2 + v3;
      return sum * 0.58 + 0.5;
    }

    // Hue is the key differentiator — cycles between cyan and magenta
    function neonRGB(v: number, px: number, py: number, time: number): [number, number, number] {
      // Hue shift: determines cyan vs magenta dominance per region
      const hueShift = Math.sin(px * 0.004 + py * 0.003 + time * 0.12) * 0.5 + 0.5;

      if (v < 0.25) {
        // Near-black with faint colour tint
        const f = v / 0.25;
        const r = lerp(2, 8, f) + hueShift * 5;
        const g = lerp(3, 10, f);
        const b = lerp(6, 18, f) + (1 - hueShift) * 5;
        return [r, g, b];
      } else if (v < 0.45) {
        const f = (v - 0.25) / 0.20;
        // Cyan path vs magenta path
        const r = lerp(8, 20 + hueShift * 60, f);
        const g = lerp(10, 40 + (1 - hueShift) * 50, f);
        const b = lerp(18, 60 + (1 - hueShift) * 40, f);
        return [r, g, b];
      } else if (v < 0.60) {
        const f = (v - 0.45) / 0.15;
        // Glow emerges
        const r = lerp(20 + hueShift * 60, hueShift * 180, f);
        const g = lerp(40 + (1 - hueShift) * 50, (1 - hueShift) * 200, f);
        const b = lerp(60 + (1 - hueShift) * 40, 80 + (1 - hueShift) * 120, f);
        return [r, g, b];
      } else if (v < 0.78) {
        const f = (v - 0.60) / 0.18;
        // Bright neon
        const r = lerp(hueShift * 180, hueShift * 255, f);
        const g = lerp((1 - hueShift) * 200, (1 - hueShift) * 255 + hueShift * 50, f);
        const b = lerp(80 + (1 - hueShift) * 120, 180 + hueShift * 40, f);
        return [Math.min(r, 255), Math.min(g, 255), Math.min(b, 255)];
      } else {
        const f = (v - 0.78) / 0.22;
        // White-hot neon core
        return [
          lerp(200, 255, f),
          lerp(220, 255, f),
          lerp(230, 255, f),
        ];
      }
    }

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
          const worldX = px * SCALE;
          const worldY = py * SCALE;
          const v = plasma(worldX, worldY, t);
          const [r, g, b] = neonRGB(v, worldX, worldY, t);
          const i = (py * cols + px) * 4;
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, W, H);

      // Grid lines overlay — subtle neon grid
      ctx.strokeStyle = `rgba(0,255,229,${(0.06 + 0.03 * Math.sin(t * 0.8)).toFixed(3)})`;
      ctx.lineWidth = 1;
      const gridSpacing = 40;
      for (let x = 0; x < W; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = 0; y < H; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      t += 0.018;
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
