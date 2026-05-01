"use client";

import { useEffect, useRef } from "react";
import { createAdaptiveCanvasRuntime } from "@/components/backgrounds/adaptiveCanvas";

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

    const runtime = createAdaptiveCanvasRuntime(canvas, {
      desktopScale: 3,
      mobileScale: 4,
      minScale: 2,
      maxScale: 6,
      targetFpsDesktop: 60,
      targetFpsMobile: 30,
      upscaleThresholdMs: 8,
      downscaleThresholdMs: 20,
    });

    const { ctx, offscreen, offCtx } = runtime;
    let t = 0;

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
      rafRef.current = requestAnimationFrame(draw);
      if (!runtime.shouldRender(now)) return;

      const frameStart = performance.now();
      const W = runtime.getWidth();
      const H = runtime.getHeight();
      if (W <= 0 || H <= 0) return;

      const scale = runtime.getScale();

      const cols = offscreen.width;
      const rows = offscreen.height;
      const imgData = offCtx.createImageData(cols, rows);
      const d = imgData.data;

      for (let py = 0; py < rows; py++) {
        for (let px = 0; px < cols; px++) {
          const worldX = px * scale;
          const worldY = py * scale;
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

      // Neon horizon and perspective floor grid.
      const horizonY = H * 0.58;
      const pulse = 0.16 + 0.08 * Math.sin(t * 1.3);

      const horizon = ctx.createLinearGradient(0, horizonY - 3, 0, horizonY + 6);
      horizon.addColorStop(0, "rgba(0,255,229,0)");
      horizon.addColorStop(0.45, `rgba(0,255,229,${(pulse + 0.2).toFixed(3)})`);
      horizon.addColorStop(1, "rgba(255,0,204,0)");
      ctx.fillStyle = horizon;
      ctx.fillRect(0, horizonY - 3, W, 12);

      const vanishX = W * 0.5;
      const depthLines = 14;
      for (let i = 0; i <= depthLines; i++) {
        const y = horizonY + ((i / depthLines) ** 1.35) * (H - horizonY);
        const alpha = 0.04 + (i / depthLines) * 0.16;
        ctx.strokeStyle = `rgba(0,255,229,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      const radialLines = 16;
      for (let i = -radialLines; i <= radialLines; i++) {
        const spread = (i / radialLines) * W * 0.95;
        const alpha = 0.05 + 0.1 * (1 - Math.abs(i) / radialLines);
        ctx.strokeStyle = `rgba(255,0,204,${alpha.toFixed(3)})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vanishX, horizonY);
        ctx.lineTo(vanishX + spread, H);
        ctx.stroke();
      }

      const scanlineAlpha = 0.03 + 0.02 * Math.sin(t * 1.6);
      ctx.fillStyle = `rgba(0,0,0,${scanlineAlpha.toFixed(3)})`;
      for (let y = 0; y < H; y += 4) {
        ctx.fillRect(0, y, W, 1);
      }

      t += 0.018;
      runtime.recordFrame(performance.now() - frameStart);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      runtime.dispose();
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
