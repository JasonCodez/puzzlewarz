"use client";

import { useEffect, useRef } from "react";
import { createAdaptiveCanvasRuntime } from "@/components/backgrounds/adaptiveCanvas";

/**
 * Animated galaxy background based on a static painted image.
 * Uses parallax drift, layered depth compositing, and star-flares.
 */
export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const runtime = createAdaptiveCanvasRuntime(canvas, {
      desktopScale: 1,
      mobileScale: 1,
      minScale: 2,
      maxScale: 6,
      targetFpsDesktop: 60,
      targetFpsMobile: 30,
      upscaleThresholdMs: 8,
      downscaleThresholdMs: 20,
    });

    const { ctx } = runtime;
    let t = 0;
    let mounted = true;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const galaxyImage = new Image();
    galaxyImage.src = "/images/galaxy_background.png?v=20260430b";

    const stars: { x: number; y: number; bright: number; speed: number; size: number; phase: number }[] = [];
    for (let i = 0; i < 72; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        bright: 0.14 + Math.random() * 0.36,
        speed: 0.22 + Math.random() * 1.25,
        size: 0.45 + Math.random() * 1.25,
        phase: Math.random() * Math.PI * 2,
      });
    }

    function drawCoverImage(img: HTMLImageElement, time: number, strength = 1) {
      const W = runtime.getWidth();
      const H = runtime.getHeight();
      if (W <= 0 || H <= 0 || !img.width || !img.height) return;

      const baseScale = Math.max(W / img.width, H / img.height);
      const zoom = prefersReducedMotion
        ? 1.02
        : 1.06 + Math.sin(time * 0.08) * 0.014 * strength;
      const scale = baseScale * zoom;

      const drawW = img.width * scale;
      const drawH = img.height * scale;

      const driftX = prefersReducedMotion ? 0 : Math.sin(time * 0.11) * 20 * strength;
      const driftY = prefersReducedMotion ? 0 : Math.cos(time * 0.09) * 15 * strength;

      const x = (W - drawW) / 2 + driftX;
      const y = (H - drawH) / 2 + driftY;
      ctx.drawImage(img, x, y, drawW, drawH);
    }

    function drawStarFlare(x: number, y: number, size: number, alpha: number, twinkle: number) {
      const ray = size * (0.9 + twinkle * 1.3);
      const diagRay = ray * 0.56;
      const glowR = size * 2.7;

      ctx.save();
      ctx.globalCompositeOperation = "screen";

      const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      glow.addColorStop(0, `rgba(255,255,255,${Math.min(1, alpha * 0.36).toFixed(3)})`);
      glow.addColorStop(0.35, `rgba(210,220,255,${(alpha * 0.16).toFixed(3)})`);
      glow.addColorStop(1, "rgba(140,120,255,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);

      ctx.lineCap = "round";
      ctx.strokeStyle = `rgba(255,255,255,${Math.min(1, alpha * 0.5).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.4, size * 0.11);
      ctx.beginPath();
      ctx.moveTo(x - ray, y);
      ctx.lineTo(x + ray, y);
      ctx.moveTo(x, y - ray);
      ctx.lineTo(x, y + ray);
      ctx.stroke();

      ctx.strokeStyle = `rgba(195,170,255,${(alpha * 0.3).toFixed(3)})`;
      ctx.lineWidth = Math.max(0.3, size * 0.08);
      ctx.beginPath();
      ctx.moveTo(x - diagRay, y - diagRay);
      ctx.lineTo(x + diagRay, y + diagRay);
      ctx.moveTo(x - diagRay, y + diagRay);
      ctx.lineTo(x + diagRay, y - diagRay);
      ctx.stroke();

      const core = Math.max(0.7, size * 0.4);
      ctx.fillStyle = `rgba(255,248,232,${Math.min(1, alpha * 0.65).toFixed(3)})`;
      ctx.fillRect(x - core * 0.5, y - core * 0.5, core, core);

      ctx.restore();
    }

    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (!runtime.shouldRender(now)) return;

      const frameStart = performance.now();
      const W = runtime.getWidth();
      const H = runtime.getHeight();
      if (W <= 0 || H <= 0) return;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#050722";
      ctx.fillRect(0, 0, W, H);

      if (galaxyImage.complete && galaxyImage.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        drawCoverImage(galaxyImage, t, 1.15);

        if (!prefersReducedMotion) {
          ctx.save();
          ctx.globalAlpha = 0.34;
          ctx.globalCompositeOperation = "screen";
          drawCoverImage(galaxyImage, t + 8.9, -0.9);
          ctx.restore();

          ctx.save();
          ctx.globalAlpha = 0.16;
          ctx.globalCompositeOperation = "lighter";
          drawCoverImage(galaxyImage, t - 12.8, 0.62);
          ctx.restore();
        }
      }

      const corePulse = prefersReducedMotion ? 0.2 : 0.26 + 0.08 * Math.sin(t * 0.7);
      const core = ctx.createRadialGradient(
        W * 0.5,
        H * 0.5,
        0,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.46
      );
      core.addColorStop(0, `rgba(255,232,205,${corePulse.toFixed(3)})`);
      core.addColorStop(0.34, "rgba(200,150,255,0.16)");
      core.addColorStop(1, "rgba(20,10,45,0)");
      ctx.fillStyle = core;
      ctx.fillRect(0, 0, W, H);

      if (!prefersReducedMotion) {
        const nebulaSweep = ctx.createRadialGradient(
          W * (0.52 + Math.sin(t * 0.16) * 0.04),
          H * (0.48 + Math.cos(t * 0.13) * 0.03),
          0,
          W * 0.5,
          H * 0.5,
          Math.max(W, H) * 0.72
        );
        nebulaSweep.addColorStop(0, "rgba(182,130,255,0.16)");
        nebulaSweep.addColorStop(0.4, "rgba(110,90,220,0.08)");
        nebulaSweep.addColorStop(1, "rgba(80,60,180,0)");
        ctx.fillStyle = nebulaSweep;
        ctx.fillRect(0, 0, W, H);
      }

      // Foreground twinkling stars rendered as star-flares (not circular dots).
      for (const star of stars) {
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.speed + star.phase);
        const alpha = star.bright * (0.2 + twinkle * 0.42);
        const sz = star.size * (0.58 + twinkle * 0.42);
        drawStarFlare(star.x * W, star.y * H, sz, alpha, twinkle);
      }

      const armGlow = ctx.createRadialGradient(
        W * 0.62,
        H * 0.42,
        0,
        W * 0.62,
        H * 0.42,
        Math.max(W, H) * 0.5
      );
      armGlow.addColorStop(0, "rgba(120,70,255,0.18)");
      armGlow.addColorStop(1, "rgba(120,70,255,0)");
      ctx.fillStyle = armGlow;
      ctx.fillRect(0, 0, W, H);

      const vignette = ctx.createRadialGradient(
        W * 0.5,
        H * 0.5,
        Math.min(W, H) * 0.33,
        W * 0.5,
        H * 0.5,
        Math.max(W, H) * 0.75
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,22,0.26)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);

      t += 0.015;
      runtime.recordFrame(performance.now() - frameStart);
    }

    const start = () => {
      if (!mounted) return;
      rafRef.current = requestAnimationFrame(draw);
    };

    if (galaxyImage.complete && galaxyImage.naturalWidth > 0) {
      start();
    } else {
      galaxyImage.onload = start;
      galaxyImage.onerror = start;
    }

    return () => {
      mounted = false;
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
