"use client";

import { useEffect, useRef } from "react";

/**
 * Animated retro/arcade background using Canvas2D.
 * 80s/90s aesthetic: scrolling star field, floating pixel-art sprites,
 * neon horizon grid, CRT scanlines, and classic arcade colors.
 */

// ── Pixel-art sprite definitions (each is a small grid) ─────────────────
// 1 = fill color, 0 = transparent
const SPRITES: { grid: number[][]; color: string }[] = [
  // Space invader (classic)
  {
    color: "#00FF88",
    grid: [
      [0,0,1,0,0,0,1,0,0],
      [0,0,0,1,0,1,0,0,0],
      [0,0,1,1,1,1,1,0,0],
      [0,1,1,0,1,0,1,1,0],
      [1,1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,1,0,1],
      [1,0,1,0,0,0,1,0,1],
      [0,0,0,1,0,1,0,0,0],
    ],
  },
  // Ghost (pac-man style)
  {
    color: "#FF55AA",
    grid: [
      [0,0,1,1,1,1,0,0],
      [0,1,1,1,1,1,1,0],
      [1,1,0,1,1,0,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1,1],
      [1,0,1,1,1,1,0,1],
      [1,0,0,1,1,0,0,1],
    ],
  },
  // Asteroid / diamond
  {
    color: "#FFDD00",
    grid: [
      [0,0,0,1,0,0,0],
      [0,0,1,1,1,0,0],
      [0,1,1,1,1,1,0],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0],
    ],
  },
  // Heart / extra life
  {
    color: "#FF3366",
    grid: [
      [0,1,1,0,1,1,0],
      [1,1,1,1,1,1,1],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0],
    ],
  },
  // Arrow / ship
  {
    color: "#55DDFF",
    grid: [
      [0,0,0,1,0,0,0],
      [0,0,1,1,1,0,0],
      [0,1,0,1,0,1,0],
      [1,0,0,1,0,0,1],
      [0,0,1,1,1,0,0],
      [0,0,0,1,0,0,0],
      [0,0,1,0,1,0,0],
    ],
  },
  // Star / power-up
  {
    color: "#FFAA00",
    grid: [
      [0,0,0,1,0,0,0],
      [0,0,1,1,1,0,0],
      [1,1,1,1,1,1,1],
      [0,1,1,1,1,1,0],
      [0,1,0,1,0,1,0],
      [1,0,0,0,0,0,1],
    ],
  },
];

interface FloatingSprite {
  spriteIdx: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  scale: number;
  alpha: number;
  rotation: number;
  rotSpeed: number;
}

interface Star {
  x: number;
  y: number;
  speed: number;
  bright: number;
  size: number;
}

export default function RetroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d")!;
    let t = 0;
    let W = 0;
    let H = 0;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);
    const FRAME_MS = isMobile ? 33 : 0;
    let lastFrame = 0;

    function resize() {
      const parent = canvas!.parentElement;
      if (!parent) return;
      W = parent.clientWidth || parent.offsetWidth || 400;
      H = parent.clientHeight || parent.offsetHeight || 600;
      canvas!.width = W;
      canvas!.height = H;
    }

    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);

    // ── Scrolling star field ──────────────────────────────────────────────
    const stars: Star[] = [];
    for (let i = 0; i < 80; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        speed: 0.2 + Math.random() * 1.5,
        bright: 0.3 + Math.random() * 0.7,
        size: 0.5 + Math.random() * 1.5,
      });
    }

    // ── Floating pixel-art sprites ────────────────────────────────────────
    const floaters: FloatingSprite[] = [];
    for (let i = 0; i < 10; i++) {
      floaters.push({
        spriteIdx: Math.floor(Math.random() * SPRITES.length),
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0004,
        vy: -0.0002 - Math.random() * 0.0003,
        scale: 2 + Math.floor(Math.random() * 2),
        alpha: 0.15 + Math.random() * 0.25,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
      });
    }

    // ── Neon horizon grid parameters ──────────────────────────────────────
    const GRID_COLOR = "rgba(180,60,255,";
    const GRID_Y_START = 0.72;

    function drawGrid() {
      const gridTop = H * GRID_Y_START;
      const gridH = H - gridTop;
      const vanishX = W / 2;
      const lineCount = 12;
      const scrollOffset = (t * 40) % (gridH / 6);

      // Horizontal lines — scroll toward viewer for depth effect
      for (let i = 0; i < 10; i++) {
        const rawY = gridTop + (i * gridH) / 6 + scrollOffset;
        if (rawY < gridTop || rawY > H) continue;
        const depth = (rawY - gridTop) / gridH;
        const alpha = 0.08 + depth * 0.25;
        ctx.strokeStyle = GRID_COLOR + alpha.toFixed(2) + ")";
        ctx.lineWidth = 1 + depth;
        ctx.beginPath();
        ctx.moveTo(0, rawY);
        ctx.lineTo(W, rawY);
        ctx.stroke();
      }

      // Vertical lines — converge to vanishing point
      for (let i = -lineCount; i <= lineCount; i++) {
        const spread = (i / lineCount) * W * 0.9;
        const alpha = 0.06 + 0.12 * (1 - Math.abs(i) / lineCount);
        ctx.strokeStyle = GRID_COLOR + alpha.toFixed(2) + ")";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(vanishX, gridTop);
        ctx.lineTo(vanishX + spread, H);
        ctx.stroke();
      }

      // Glow line at horizon
      const horizGrad = ctx.createLinearGradient(0, gridTop - 2, 0, gridTop + 6);
      horizGrad.addColorStop(0, "rgba(180,60,255,0)");
      horizGrad.addColorStop(0.5, "rgba(180,60,255,0.5)");
      horizGrad.addColorStop(1, "rgba(180,60,255,0)");
      ctx.fillStyle = horizGrad;
      ctx.fillRect(0, gridTop - 2, W, 8);
    }

    function drawSprite(spr: FloatingSprite) {
      const def = SPRITES[spr.spriteIdx];
      const grid = def.grid;
      const px = spr.scale;
      const sx = spr.x * W;
      const sy = spr.y * H;

      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(spr.rotation);
      ctx.globalAlpha = spr.alpha;
      ctx.fillStyle = def.color;

      const halfW = (grid[0].length * px) / 2;
      const halfH = (grid.length * px) / 2;

      for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
          if (grid[r][c]) {
            ctx.fillRect(c * px - halfW, r * px - halfH, px, px);
          }
        }
      }

      ctx.restore();
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

      // ── Dark purple-black gradient base ──────────────────────────────────
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#08001a");
      bg.addColorStop(0.5, "#0d0028");
      bg.addColorStop(0.75, "#150040");
      bg.addColorStop(1, "#0a0020");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Stars ────────────────────────────────────────────────────────────
      for (const star of stars) {
        star.y += star.speed * 0.0008;
        if (star.y > 1) { star.y = 0; star.x = Math.random(); }
        const twinkle = 0.5 + 0.5 * Math.sin(t * star.speed * 2 + star.x * 50);
        const alpha = star.bright * twinkle;
        ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
        ctx.fillRect(
          Math.floor(star.x * W),
          Math.floor(star.y * H),
          star.size,
          star.size,
        );
      }

      // ── Perspective grid ─────────────────────────────────────────────────
      drawGrid();

      // ── Floating pixel sprites ───────────────────────────────────────────
      for (const f of floaters) {
        f.x += f.vx;
        f.y += f.vy;
        f.rotation += f.rotSpeed;

        // Wrap around
        if (f.y < -0.05) { f.y = 1.05; f.x = Math.random(); }
        if (f.x < -0.05) f.x = 1.05;
        if (f.x > 1.05) f.x = -0.05;

        drawSprite(f);
      }

      // ── CRT scanlines ───────────────────────────────────────────────────
      ctx.fillStyle = "rgba(0,0,0,0.06)";
      for (let y = 0; y < H; y += 3) {
        ctx.fillRect(0, y, W, 1);
      }

      // ── Subtle CRT vignette ─────────────────────────────────────────────
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.28, W / 2, H / 2, W * 0.72);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.4)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      t += 0.016;
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
