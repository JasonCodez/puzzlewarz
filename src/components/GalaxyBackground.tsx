"use client";

import { useEffect, useRef } from "react";

/**
 * Animated galaxy/nebula background using Canvas2D.
 * Swirling purple-blue nebula clouds with twinkling stars.
 */
export default function GalaxyBackground() {
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

    // Pre-generate star positions (fixed per mount)
    const stars: { x: number; y: number; bright: number; speed: number }[] = [];
    for (let i = 0; i < 120; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        bright: 0.4 + Math.random() * 0.6,
        speed: 0.5 + Math.random() * 2.5,
      });
    }

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

    // Nebula turbulence — slow swirling clouds
    function nebula(px: number, py: number, time: number): number {
      const v1 =
        Math.sin(px * 0.006 + time * 0.18) * 0.25 +
        Math.sin(py * 0.008 - time * 0.14) * 0.20 +
        Math.sin((px - py) * 0.005 + time * 0.22) * 0.15;

      const v2 =
        Math.sin(px * 0.014 + py * 0.01 - time * 0.28) * 0.12 +
        Math.sin(px * 0.004 - py * 0.016 + time * 0.16) * 0.08;

      // Spiral warp
      const angle = Math.atan2(py - H / 2, px - W / 2);
      const dist = Math.sqrt((px - W / 2) ** 2 + (py - H / 2) ** 2) * 0.003;
      const spiral = Math.sin(angle * 2 + dist * 3 - time * 0.12) * 0.15;

      const sum = v1 + v2 + spiral;
      return sum * 0.55 + 0.5;
    }

    // Galaxy colour ramp: deep space → purple nebula → blue-white core
    function galaxyRGB(v: number): [number, number, number] {
      if (v < 0.25) {
        const f = v / 0.25;
        return [lerp(2, 12, f), lerp(1, 6, f), lerp(8, 22, f)];
      } else if (v < 0.40) {
        const f = (v - 0.25) / 0.15;
        return [lerp(12, 55, f), lerp(6, 18, f), lerp(22, 70, f)];
      } else if (v < 0.55) {
        const f = (v - 0.40) / 0.15;
        return [lerp(55, 110, f), lerp(18, 45, f), lerp(70, 140, f)];
      } else if (v < 0.70) {
        const f = (v - 0.55) / 0.15;
        return [lerp(110, 160, f), lerp(45, 80, f), lerp(140, 200, f)];
      } else if (v < 0.85) {
        const f = (v - 0.70) / 0.15;
        return [lerp(160, 200, f), lerp(80, 140, f), lerp(200, 240, f)];
      } else {
        const f = (v - 0.85) / 0.15;
        return [lerp(200, 240, f), lerp(140, 210, f), lerp(240, 255, f)];
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
          const v = nebula(px * SCALE, py * SCALE, t);
          const [r, g, b] = galaxyRGB(v);
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

      // Draw twinkling stars on top
      for (const star of stars) {
        const twinkle =
          0.5 + 0.5 * Math.sin(t * star.speed + star.x * 100);
        const alpha = star.bright * twinkle;
        const sz = 1 + twinkle * 1.5;
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(star.x * W, star.y * H, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      t += 0.015;
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
