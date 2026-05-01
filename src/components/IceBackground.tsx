"use client";

import { useEffect, useRef } from "react";
import { createAdaptiveCanvasRuntime } from "@/components/backgrounds/adaptiveCanvas";

interface SnowFlake {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
}

interface IceShard {
  x: number;
  y: number;
  width: number;
  height: number;
  drift: number;
  sway: number;
  alpha: number;
  phase: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function fract(value: number) {
  return value - Math.floor(value);
}

function hash1(value: number) {
  return fract(Math.sin(value * 127.1) * 43758.5453123);
}

/**
 * Animated ice background.
 * Visual direction: frozen cavern surface with crystal shards, icicles, frost cracks and snow drift.
 */
export default function IceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const runtime = createAdaptiveCanvasRuntime(canvas, {
      desktopScale: 3,
      mobileScale: 5,
      minScale: 2,
      maxScale: 7,
      targetFpsDesktop: 60,
      targetFpsMobile: 30,
      upscaleThresholdMs: 8,
      downscaleThresholdMs: 20,
    });

    const { ctx, offscreen, offCtx } = runtime;
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let t = 0;
    let lastNowMs = performance.now();
    let lastW = runtime.getWidth();
    let lastH = runtime.getHeight();

    let snowflakes: SnowFlake[] = [];
    let shards: IceShard[] = [];

    const lerp = (a: number, b: number, f: number) => a + (b - a) * clamp(f, 0, 1);

    function initScene(width: number, height: number) {
      const snowCount = Math.max(50, Math.min(140, Math.floor((width * height) / 12000)));
      snowflakes = Array.from({ length: snowCount }, (_, idx) => {
        const seed = hash1(idx * 17.23 + width * 0.01 + height * 0.004);
        return {
          x: seed * width,
          y: hash1(idx * 23.91 + 4.3) * height,
          size: 0.6 + hash1(idx * 13.73 + 2.1) * 1.9,
          speed: 8 + hash1(idx * 19.19 + 9.4) * 26,
          drift: 2 + hash1(idx * 29.17 + 5.6) * 12,
          phase: hash1(idx * 31.49 + 7.1) * Math.PI * 2,
          alpha: 0.28 + hash1(idx * 41.03 + 8.8) * 0.56,
        };
      });

      const shardCount = Math.max(7, Math.min(14, Math.floor(width / 120)));
      shards = Array.from({ length: shardCount }, (_, idx) => ({
        x: -0.05 + hash1(idx * 7.83 + 1.1) * 1.1,
        y: -0.08 + hash1(idx * 11.61 + 2.6) * 0.3,
        width: 0.06 + hash1(idx * 5.27 + 3.8) * 0.12,
        height: 0.18 + hash1(idx * 9.14 + 6.4) * 0.32,
        drift: 0.004 + hash1(idx * 4.31 + 7.7) * 0.01,
        sway: 0.4 + hash1(idx * 14.17 + 8.2) * 1.2,
        alpha: 0.12 + hash1(idx * 18.67 + 3.2) * 0.3,
        phase: hash1(idx * 21.49 + 9.9) * Math.PI * 2,
      }));
    }

    function turbulence(px: number, py: number, time: number) {
      const warpX =
        Math.sin(py * 0.006 + time * 0.32) * 58 +
        Math.cos(px * 0.005 - time * 0.27) * 36;
      const warpY =
        Math.cos(px * 0.007 + time * 0.22) * 44 +
        Math.sin(py * 0.009 - time * 0.2) * 28;

      const wx = px + warpX;
      const wy = py + warpY;

      const broad =
        Math.sin(wx * 0.008 + time * 0.28) * 0.26 +
        Math.sin(wy * 0.01 - time * 0.21) * 0.23 +
        Math.sin((wx + wy) * 0.006 + time * 0.19) * 0.17;

      const detail =
        Math.sin(wx * 0.015 - wy * 0.012 + time * 0.34) * 0.13 +
        Math.sin(wx * 0.005 + wy * 0.018 - time * 0.24) * 0.09;

      return broad + detail;
    }

    function fracture(px: number, py: number, time: number) {
      const c1 = Math.abs(Math.sin(px * 0.013 + py * 0.004 + time * 0.09));
      const c2 = Math.abs(Math.sin(px * 0.006 - py * 0.011 - time * 0.06));
      const c3 = Math.abs(Math.sin((px - py) * 0.008 + time * 0.07));
      const combined = c1 * c2 * c3;
      return Math.pow(1 - Math.min(1, combined * 3.6), 4.3);
    }

    function facetHighlight(px: number, py: number, time: number) {
      const r1 = Math.abs(Math.sin(px * 0.02 - py * 0.017 + time * 0.11));
      const r2 = Math.abs(Math.sin(px * 0.011 + py * 0.016 - time * 0.07));
      return Math.pow(1 - Math.min(r1, r2), 2.2);
    }

    function iceRGB(field: number, crack: number, facet: number, depth: number): [number, number, number] {
      const normalized = clamp(field * 0.56 + 0.5 + facet * 0.14, 0, 1);

      let r = lerp(10, 172, normalized);
      let g = lerp(26, 220, normalized);
      let b = lerp(56, 246, normalized);

      const topFrost = clamp(1 - depth * 1.35, 0, 1);
      r += topFrost * 26;
      g += topFrost * 18;
      b += topFrost * 10;

      if (crack > 0.02) {
        const crackMix = clamp(crack, 0, 1);
        r = lerp(r, 8, crackMix * 0.85);
        g = lerp(g, 26, crackMix * 0.75);
        b = lerp(b, 92, crackMix * 0.55);
      }

      const sparkle = Math.pow(facet, 1.4) * 34;
      r += sparkle * 0.6;
      g += sparkle * 0.9;
      b += sparkle * 1.1;

      return [
        Math.round(clamp(r, 0, 255)),
        Math.round(clamp(g, 0, 255)),
        Math.round(clamp(b, 0, 255)),
      ];
    }

    function drawSubsurfaceIce(width: number, height: number, time: number) {
      const scale = runtime.getScale();
      const cols = offscreen.width;
      const rows = offscreen.height;
      const imgData = offCtx.createImageData(cols, rows);
      const data = imgData.data;

      for (let py = 0; py < rows; py += 1) {
        for (let px = 0; px < cols; px += 1) {
          const worldX = px * scale;
          const worldY = py * scale;
          const depth = py / Math.max(1, rows - 1);

          const field = turbulence(worldX, worldY, time);
          const crack = fracture(worldX, worldY, time);
          const facet = facetHighlight(worldX, worldY, time);
          const [r, g, b] = iceRGB(field, crack, facet, depth);

          const i = (py * cols + px) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }

      offCtx.putImageData(imgData, 0, 0);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(offscreen, 0, 0, width, height);
    }

    function drawTopIcicles(width: number, height: number, time: number) {
      const count = Math.max(8, Math.floor(width / 95));

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < count; i += 1) {
        const seed = hash1(i * 13.57 + 1.7);
        const xBase = (i / count) * width;
        const sway = prefersReducedMotion ? 0 : Math.sin(time * 0.8 + i * 1.1) * width * 0.004;
        const x = xBase + sway;
        const span = (width / count) * (0.44 + seed * 0.5);
        const len = height * (0.08 + seed * 0.1);

        const grad = ctx.createLinearGradient(x, -2, x, len + 4);
        grad.addColorStop(0, "rgba(230,252,255,0.58)");
        grad.addColorStop(0.4, "rgba(165,232,251,0.24)");
        grad.addColorStop(1, "rgba(120,190,225,0.04)");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x - span * 0.48, -2);
        ctx.lineTo(x + span * 0.52, -2);
        ctx.lineTo(x + span * 0.06, len);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(224,251,255,0.24)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + span * 0.04, 2);
        ctx.lineTo(x + span * 0.04, len - 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawCrystallineShards(width: number, height: number, time: number) {
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < shards.length; i += 1) {
        const shard = shards[i];
        const drift = prefersReducedMotion
          ? 0
          : Math.sin(time * shard.sway + shard.phase) * width * shard.drift;

        const x = shard.x * width + drift;
        const y = shard.y * height;
        const w = shard.width * width;
        const h = shard.height * height;

        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, "rgba(225,250,255,0.62)");
        grad.addColorStop(0.28, "rgba(160,225,248,0.24)");
        grad.addColorStop(1, "rgba(115,188,226,0.03)");

        ctx.globalAlpha = shard.alpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + w * 0.56, y + h * 0.88);
        ctx.lineTo(x + w * 0.08, y + h);
        ctx.lineTo(x - w * 0.42, y + h * 0.76);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(220,250,255,0.28)";
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.strokeStyle = "rgba(245,255,255,0.26)";
        ctx.beginPath();
        ctx.moveTo(x + w * 0.02, y + h * 0.04);
        ctx.lineTo(x + w * 0.06, y + h * 0.94);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawFrostCracks(width: number, height: number, time: number) {
      ctx.save();

      const lineAlpha = prefersReducedMotion ? 0.12 : 0.18;
      ctx.strokeStyle = `rgba(186,236,255,${lineAlpha.toFixed(3)})`;
      ctx.lineWidth = 1;

      const bands = 6;
      for (let i = 0; i < bands; i += 1) {
        const baseY = height * (0.43 + i * 0.085);
        const amp = 7 + i * 1.6;

        ctx.beginPath();
        for (let s = 0; s <= 24; s += 1) {
          const x = (s / 24) * width;
          const y =
            baseY +
            Math.sin(s * 1.21 + i * 1.37 + time * 0.12) * amp +
            Math.sin(s * 3.63 + i * 0.71) * 2.8;

          if (s === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(205,244,255,0.14)";
      for (let i = 0; i < 5; i += 1) {
        const x = width * ((i + 1) / 6) + Math.sin(time * 0.18 + i * 1.6) * 10;
        const y = height * (0.45 + (i % 3) * 0.13);

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 24, y + 16);
        ctx.lineTo(x - 40, y + 34);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 20, y + 12);
        ctx.lineTo(x + 34, y + 28);
        ctx.stroke();
      }

      ctx.restore();
    }

    function drawSnow(width: number, height: number, time: number, deltaSec: number) {
      ctx.save();

      for (let i = 0; i < snowflakes.length; i += 1) {
        const flake = snowflakes[i];

        flake.y += flake.speed * deltaSec * (prefersReducedMotion ? 0.35 : 1);
        flake.x += Math.sin(time * 0.9 + flake.phase) * flake.drift * deltaSec;

        if (flake.y > height + 8) {
          flake.y = -8;
          flake.x = hash1(i * 9.07 + time * 0.12) * width;
        }
        if (flake.x < -8) flake.x += width + 16;
        if (flake.x > width + 8) flake.x -= width + 16;

        const alphaPulse = prefersReducedMotion
          ? flake.alpha * 0.8
          : flake.alpha * (0.68 + 0.32 * Math.sin(time * 1.5 + flake.phase));

        ctx.globalAlpha = clamp(alphaPulse, 0.08, 0.95);
        ctx.fillStyle = "#eaffff";
        ctx.fillRect(flake.x, flake.y, flake.size, flake.size);

        if (!prefersReducedMotion && flake.size > 1.45) {
          ctx.globalAlpha = clamp(alphaPulse * 0.32, 0.04, 0.35);
          ctx.fillRect(flake.x - flake.size * 0.6, flake.y - flake.size * 0.6, flake.size * 2.2, flake.size * 2.2);
        }
      }

      ctx.restore();
    }

    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (!runtime.shouldRender(now)) return;

      const frameStart = performance.now();
      const W = runtime.getWidth();
      const H = runtime.getHeight();
      if (W <= 0 || H <= 0) return;

      const deltaSec = Math.min(0.05, Math.max(1 / 240, (now - lastNowMs) / 1000 || 1 / 60));
      lastNowMs = now;

      if (W !== lastW || H !== lastH) {
        lastW = W;
        lastH = H;
        initScene(W, H);
      }

      drawSubsurfaceIce(W, H, t);
      drawTopIcicles(W, H, t);
      drawCrystallineShards(W, H, t);
      drawFrostCracks(W, H, t);
      drawSnow(W, H, t, deltaSec);

      const coldBloom = ctx.createRadialGradient(
        W * 0.18,
        H * 0.08,
        0,
        W * 0.18,
        H * 0.08,
        Math.max(W, H) * 0.62
      );
      coldBloom.addColorStop(0, "rgba(208,248,255,0.24)");
      coldBloom.addColorStop(0.48, "rgba(120,198,232,0.1)");
      coldBloom.addColorStop(1, "rgba(40,90,130,0)");
      ctx.fillStyle = coldBloom;
      ctx.fillRect(0, 0, W, H);

      const floorMist = ctx.createLinearGradient(0, H * 0.58, 0, H);
      floorMist.addColorStop(0, "rgba(120,210,245,0)");
      floorMist.addColorStop(1, "rgba(120,210,245,0.12)");
      ctx.fillStyle = floorMist;
      ctx.fillRect(0, H * 0.58, W, H * 0.42);

      const frostVignette = ctx.createRadialGradient(
        W * 0.5,
        H * 0.5,
        Math.min(W, H) * 0.25,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.78
      );
      frostVignette.addColorStop(0, "rgba(255,255,255,0)");
      frostVignette.addColorStop(1, "rgba(3,20,42,0.28)");
      ctx.fillStyle = frostVignette;
      ctx.fillRect(0, 0, W, H);

      const sweep = (Math.sin(t * 0.42) * 0.5 + 0.5) * W;
      const sheen = ctx.createLinearGradient(sweep - W * 0.28, 0, sweep + W * 0.28, H);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.52, "rgba(222,249,255,0.16)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, W, H);

      t += deltaSec * (prefersReducedMotion ? 0.3 : 1);
      runtime.recordFrame(performance.now() - frameStart);
    }

    initScene(lastW || 1, lastH || 1);
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
