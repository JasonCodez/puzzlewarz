"use client";

import { useEffect, useRef } from "react";

/**
 * Animated ice background using Canvas2D.
 * Domain-warped turbulence (same architecture as LavaBackground)
 * with a bright cyan-white ice colour ramp and subtle crack veins.
 */
export default function IceBackground() {
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
    const SCALE = isMobile ? 5 : 3;
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

    // ── Domain-warped turbulence — slow glacial shift ─────────────────────
    function turbulence(px: number, py: number, time: number): number {
      // Large spatial warp, slow temporal = looking through thick ice
      const warpX =
        Math.sin(py * 0.006 + time * 0.12) * 65 +
        Math.cos(px * 0.005 + time * 0.09) * 40;
      const warpY =
        Math.cos(px * 0.007 - time * 0.10) * 55 +
        Math.sin(py * 0.008 + time * 0.08) * 35;

      const wx = px + warpX;
      const wy = py + warpY;

      // Broad glacial flow
      const v1 =
        Math.sin(wx * 0.007 + time * 0.15) * 0.24 +
        Math.sin(wy * 0.009 - time * 0.11) * 0.20 +
        Math.sin((wx + wy) * 0.005 + time * 0.18) * 0.16;

      // Detail layer
      const v2 =
        Math.sin(wx * 0.016 - wy * 0.012 + time * 0.22) * 0.12 +
        Math.sin(wx * 0.004 + wy * 0.019 - time * 0.14) * 0.08;

      // Second warp pass for depth
      const w2x = wx + Math.sin(wy * 0.006 + time * 0.13) * 30;
      const w2y = wy + Math.cos(wx * 0.005 - time * 0.11) * 25;
      const v3 = Math.sin(w2x * 0.008 + w2y * 0.006 + time * 0.16) * 0.18;

      return (v1 + v2 + v3) * 0.6 + 0.5;
    }

    // ── Crack veins — abs(sin) creates sharp V-valleys = dark lines ──────
    function cracks(px: number, py: number, time: number): number {
      const drift = time * 0.06;
      const c1 = Math.abs(Math.sin(px * 0.012 + py * 0.004 + drift));
      const c2 = Math.abs(Math.sin(px * 0.005 - py * 0.011 - drift * 0.7));
      const c3 = Math.abs(Math.sin((px - py) * 0.008 + drift * 1.1));
      // Multiply: only where ALL three are near zero do we get a deep crack
      const combined = c1 * c2 * c3;
      // Invert and sharpen: low combined = crack
      return Math.pow(1 - Math.min(1, combined * 4), 5);
    }

    // ── Ice colour ramp — BRIGHT: medium blue → cyan → pale → white ─────
    // 0.00 → 0.20 : deepest visible ice (medium blue, NOT navy/black)
    // 0.20 → 0.38 : blue ice
    // 0.38 → 0.55 : cyan-blue
    // 0.55 → 0.70 : bright cyan
    // 0.70 → 0.85 : pale cyan-white
    // 0.85 → 1.00 : near-white frost
    function iceRGB(v: number, crack: number): [number, number, number] {
      v = Math.max(0, Math.min(1, v));
      let r: number, g: number, b: number;

      if (v < 0.20) {
        const f = v / 0.20;
        r = lerp(25, 40, f);
        g = lerp(55, 80, f);
        b = lerp(120, 155, f);
      } else if (v < 0.38) {
        const f = (v - 0.20) / 0.18;
        r = lerp(40, 60, f);
        g = lerp(80, 130, f);
        b = lerp(155, 195, f);
      } else if (v < 0.55) {
        const f = (v - 0.38) / 0.17;
        r = lerp(60, 95, f);
        g = lerp(130, 185, f);
        b = lerp(195, 225, f);
      } else if (v < 0.70) {
        const f = (v - 0.55) / 0.15;
        r = lerp(95, 145, f);
        g = lerp(185, 220, f);
        b = lerp(225, 242, f);
      } else if (v < 0.85) {
        const f = (v - 0.70) / 0.15;
        r = lerp(145, 200, f);
        g = lerp(220, 240, f);
        b = lerp(242, 252, f);
      } else {
        const f = (v - 0.85) / 0.15;
        r = lerp(200, 235, f);
        g = lerp(240, 250, f);
        b = lerp(252, 255, f);
      }

      // Darken at cracks — medium-dark blue, not black
      if (crack > 0.1) {
        const ci = Math.min(1, crack * crack);
        r = lerp(r, 18, ci * 0.75);
        g = lerp(g, 40, ci * 0.65);
        b = lerp(b, 100, ci * 0.50);
      }

      return [r, g, b];
    }

    // ── Main render loop ─────────────────────────────────────────────────
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

          const v = turbulence(worldX, worldY, t);
          const crack = cracks(worldX, worldY, t);
          const [r, g, b] = iceRGB(v, crack);

          const i = (py * cols + px) * 4;
          d[i] = r;
          d[i + 1] = g;
          d[i + 2] = b;
          d[i + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);

      // Upscale with bilinear smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, W, H);

      t += 0.014;
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
