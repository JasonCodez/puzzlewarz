"use client";

import { useEffect, useRef } from "react";
import { createAdaptiveCanvasRuntime } from "./backgrounds/adaptiveCanvas";

interface Star {
  x: number;
  y: number;
  size: number;
  twinkle: number;
  speed: number;
}

type PixelGrid = number[][];

interface InvaderSprite {
  color: string;
  frames: PixelGrid[];
}

interface Invader {
  x: number;
  y: number;
  vx: number;
  bobAmp: number;
  bobSpeed: number;
  phase: number;
  scale: number;
  alpha: number;
  spriteIdx: number;
  alive: boolean;
  respawnTimer: number;
}

interface InvaderPose {
  sprite: InvaderSprite;
  frame: PixelGrid;
  px: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Projectile {
  x: number;
  y: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface ShipState {
  x: number;
  y: number;
  targetX: number;
  repathCooldown: number;
  fireCooldown: number;
  phase: number;
}

function grid(rows: string[]): PixelGrid {
  return rows.map((row) => row.split("").map((ch) => (ch === "1" ? 1 : 0)));
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const INVADER_SPRITES: InvaderSprite[] = [
  {
    color: "#5ff5ff",
    frames: [
      grid([
        "00011000011",
        "00111100111",
        "01111111111",
        "11101111011",
        "11111111111",
        "10111111101",
        "10100000101",
        "01000000010",
      ]),
      grid([
        "00011000011",
        "00111100111",
        "01111111111",
        "11101111011",
        "11111111111",
        "00111111100",
        "01010001010",
        "10000000001",
      ]),
    ],
  },
  {
    color: "#ff7bff",
    frames: [
      grid([
        "0011001100",
        "0111111110",
        "1111111111",
        "1101111011",
        "1111111111",
        "0011111100",
        "0110011010",
      ]),
      grid([
        "0011001100",
        "0111111110",
        "1111111111",
        "1101111011",
        "1111111111",
        "0111111110",
        "1000000001",
      ]),
    ],
  },
  {
    color: "#ffd166",
    frames: [
      grid([
        "0001111000",
        "0011111100",
        "0110110110",
        "1111111111",
        "1011111101",
        "0010110100",
        "0101001010",
      ]),
      grid([
        "0001111000",
        "0011111100",
        "0110110110",
        "1111111111",
        "1011111101",
        "0100110010",
        "1001001001",
      ]),
    ],
  },
];

const SHIP_SPRITE: PixelGrid = grid([
  "0000001000000",
  "0000011100000",
  "0000111110000",
  "0001111111000",
  "0011111111100",
  "0111001001110",
  "1110001000111",
]);

const SHIP_TIP_COL = (() => {
  const idx = SHIP_SPRITE[0].indexOf(1);
  return idx >= 0 ? idx : Math.floor(SHIP_SPRITE[0].length / 2);
})();

export default function RetroBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasEl = canvas;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const runtime = createAdaptiveCanvasRuntime(canvasEl, {
      desktopScale: 1,
      mobileScale: 1,
      minScale: 1,
      maxScale: 2,
      targetFpsDesktop: prefersReducedMotion ? 30 : 60,
      targetFpsMobile: prefersReducedMotion ? 24 : 30,
      upscaleThresholdMs: 8,
      downscaleThresholdMs: 20,
    });
    const { ctx: renderCtx } = runtime;

    let stars: Star[] = [];

    function spawnInvader(spriteIdx: number, inView: boolean): Invader {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const x = inView
        ? Math.random() * 1.2 - 0.1
        : dir > 0
          ? -0.22 - Math.random() * 0.12
          : 1.22 + Math.random() * 0.12;

      return {
        x,
        y: 0.12 + Math.random() * 0.4,
        vx: dir * (0.045 + Math.random() * 0.07),
        bobAmp: 0.008 + Math.random() * 0.012,
        bobSpeed: 1.3 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        scale: 0.9 + Math.random() * 0.6,
        alpha: 0.2 + Math.random() * 0.35,
        spriteIdx,
        alive: true,
        respawnTimer: 0,
      };
    }

    const invaders: Invader[] = Array.from({ length: 16 }, (_, idx) =>
      spawnInvader(idx % INVADER_SPRITES.length, true)
    );

    const ship: ShipState = {
      x: 0.5,
      y: 0.88,
      targetX: 0.5,
      repathCooldown: 0.3,
      fireCooldown: 0.45,
      phase: Math.random() * Math.PI * 2,
    };

    const projectiles: Projectile[] = [];
    const particles: PixelParticle[] = [];

    function initStars(W: number, H: number) {
      const count = Math.max(60, Math.floor((W * H) / 10500));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * W,
        y: Math.random() * H * 0.72,
        size: Math.random() * 1.6 + 0.4,
        twinkle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.08 + 0.02,
      }));
    }

    function drawSun(W: number, H: number, time: number) {
      const cx = W * 0.78;
      const cy = H * 0.26;
      const radius = Math.min(W, H) * 0.12;

      const glow = renderCtx.createRadialGradient(cx, cy, radius * 0.3, cx, cy, radius * 2.3);
      glow.addColorStop(0, "rgba(255,170,120,0.92)");
      glow.addColorStop(0.35, "rgba(255,90,170,0.5)");
      glow.addColorStop(1, "rgba(255,90,170,0)");
      renderCtx.fillStyle = glow;
      renderCtx.fillRect(cx - radius * 2.3, cy - radius * 2.3, radius * 4.6, radius * 4.6);

      renderCtx.beginPath();
      renderCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      renderCtx.fillStyle = "#ff955f";
      renderCtx.fill();

      const coreHighlight = renderCtx.createRadialGradient(
        cx - radius * 0.24,
        cy - radius * 0.28,
        radius * 0.08,
        cx,
        cy,
        radius * 1.08
      );
      coreHighlight.addColorStop(0, "rgba(255,245,210,0.34)");
      coreHighlight.addColorStop(0.45, "rgba(255,185,120,0.2)");
      coreHighlight.addColorStop(1, "rgba(255,110,70,0)");
      renderCtx.fillStyle = coreHighlight;
      renderCtx.beginPath();
      renderCtx.arc(cx, cy, radius * 0.98, 0, Math.PI * 2);
      renderCtx.fill();

      const rimAlpha = prefersReducedMotion
        ? 0.18
        : 0.16 + 0.06 * Math.sin(time * 0.85);
      renderCtx.strokeStyle = `rgba(255,235,195,${rimAlpha.toFixed(3)})`;
      renderCtx.lineWidth = Math.max(1, radius * 0.018);
      renderCtx.beginPath();
      renderCtx.arc(cx, cy, radius * 0.985, 0, Math.PI * 2);
      renderCtx.stroke();
    }

    function drawGrid(W: number, H: number, time: number, horizonY: number) {
      const vanishX = W * 0.5 + Math.sin(time * 0.16) * W * 0.04;

      const horizonGlow = renderCtx.createLinearGradient(0, horizonY - 4, 0, horizonY + 8);
      horizonGlow.addColorStop(0, "rgba(255,90,170,0)");
      horizonGlow.addColorStop(0.45, "rgba(255,90,170,0.34)");
      horizonGlow.addColorStop(1, "rgba(90,230,255,0.08)");
      renderCtx.fillStyle = horizonGlow;
      renderCtx.fillRect(0, horizonY - 4, W, 12);

      const scroll = ((time * 42) % 18) + 18;
      for (let i = -1; i < 65; i += 1) {
        const raw = horizonY + i * 18 + scroll;
        if (raw < horizonY || raw > H + 8) continue;

        const depth = (raw - horizonY) / Math.max(1, H - horizonY);
        const alpha = 0.26 * (1 - depth);
        const lineWidth = 1 + depth * 1.4;

        renderCtx.strokeStyle = `rgba(98,230,255,${alpha.toFixed(3)})`;
        renderCtx.lineWidth = lineWidth;
        renderCtx.beginPath();
        renderCtx.moveTo(0, raw);
        renderCtx.lineTo(W, raw);
        renderCtx.stroke();
      }

      renderCtx.lineWidth = 1;
      for (let i = -24; i <= 24; i += 1) {
        const x = vanishX + i * (W / 24);
        const alpha = 0.2 + (1 - Math.min(1, Math.abs(i) / 24)) * 0.26;

        renderCtx.strokeStyle = `rgba(125,240,255,${alpha.toFixed(3)})`;
        renderCtx.beginPath();
        renderCtx.moveTo(vanishX, horizonY);
        renderCtx.lineTo(x, H + 20);
        renderCtx.stroke();
      }
    }

    function getInvaderPose(invader: Invader, W: number, H: number, time: number): InvaderPose | null {
      if (!invader.alive) return null;

      const sprite = INVADER_SPRITES[invader.spriteIdx];
      const animIdx = prefersReducedMotion
        ? 0
        : Math.floor((time * 3.1 + invader.phase) % sprite.frames.length);
      const frame = sprite.frames[animIdx];
      const px = invader.scale * Math.max(1, Math.min(W, H) / 420);
      const frameW = frame[0].length * px;
      const frameH = frame.length * px;
      const bob = Math.sin(time * invader.bobSpeed + invader.phase) * invader.bobAmp * H;

      const centerX = invader.x * W;
      const centerY = invader.y * H + bob;

      return {
        sprite,
        frame,
        px,
        left: centerX - frameW * 0.5,
        top: centerY - frameH * 0.5,
        width: frameW,
        height: frameH,
      };
    }

    function drawInvader(invader: Invader, W: number, H: number, time: number) {
      const pose = getInvaderPose(invader, W, H, time);
      if (!pose) return;

      const alpha = clamp(invader.alpha * (invader.alive ? 1 : 0), 0, 1);

      renderCtx.save();
      renderCtx.globalAlpha = alpha;

      for (let r = 0; r < pose.frame.length; r += 1) {
        for (let c = 0; c < pose.frame[r].length; c += 1) {
          if (!pose.frame[r][c]) continue;

          const x = pose.left + c * pose.px;
          const y = pose.top + r * pose.px;

          renderCtx.fillStyle = pose.sprite.color;
          renderCtx.shadowColor = pose.sprite.color;
          renderCtx.shadowBlur = 7;
          renderCtx.fillRect(x, y, pose.px, pose.px);
        }
      }

      if (!prefersReducedMotion) {
        const flamePulse = 0.35 + 0.65 * Math.sin(time * 13 + invader.phase);

        renderCtx.globalAlpha = alpha * (0.28 + flamePulse * 0.32);
        renderCtx.fillStyle = "#ffe8a0";
        renderCtx.shadowColor = "#ffe8a0";
        renderCtx.shadowBlur = 8;

        const jetWidth = pose.width * 0.2;
        const jetHeight = pose.px * (1.4 + flamePulse * 1.9);
        const jetLeft = pose.left + pose.width * 0.4;

        renderCtx.fillRect(jetLeft, pose.top + pose.height, jetWidth, jetHeight);
      }

      renderCtx.restore();
    }

    function spawnInvaderExplosion(pose: InvaderPose) {
      const centerX = pose.left + pose.width * 0.5;
      const centerY = pose.top + pose.height * 0.5;

      for (let r = 0; r < pose.frame.length; r += 1) {
        for (let c = 0; c < pose.frame[r].length; c += 1) {
          if (!pose.frame[r][c]) continue;
          if (Math.random() > 0.9) continue;

          const x = pose.left + c * pose.px + pose.px * 0.5;
          const y = pose.top + r * pose.px + pose.px * 0.5;
          const angle =
            Math.atan2(y - centerY, x - centerX) + (Math.random() - 0.5) * 0.9;
          const speed = 24 + Math.random() * 90;

          particles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 10,
            life: 1.8 + Math.random() * 0.9,
            maxLife: 1.8 + Math.random() * 0.9,
            size: Math.max(1, Math.round(pose.px * (0.9 + Math.random() * 0.55))),
            color: pose.sprite.color,
          });
        }
      }
    }

    function drawShip(W: number, H: number, time: number) {
      const px = Math.max(1, Math.min(W, H) / 140);
      const shipW = SHIP_SPRITE[0].length * px;
      const shipH = SHIP_SPRITE.length * px;
      const centerX = ship.x * W;
      const centerY = ship.y * H;
      const left = centerX - shipW * 0.5;
      const top = centerY - shipH * 0.5;

      renderCtx.save();
      renderCtx.globalAlpha = 0.96;

      for (let r = 0; r < SHIP_SPRITE.length; r += 1) {
        for (let c = 0; c < SHIP_SPRITE[r].length; c += 1) {
          if (!SHIP_SPRITE[r][c]) continue;

          const x = left + c * px;
          const y = top + r * px;

          const isCore = r < 3 && c > 4 && c < 8;
          renderCtx.fillStyle = isCore ? "#ffe58f" : "#8cf6ff";
          renderCtx.shadowColor = isCore ? "#ffe58f" : "#8cf6ff";
          renderCtx.shadowBlur = isCore ? 10 : 7;
          renderCtx.fillRect(x, y, px, px);
        }
      }

      if (!prefersReducedMotion) {
        const thrustPulse = 0.45 + 0.55 * Math.sin(time * 12 + ship.phase);

        renderCtx.globalAlpha = 0.35 + thrustPulse * 0.4;
        renderCtx.fillStyle = "#ffb56d";
        renderCtx.shadowColor = "#ffb56d";
        renderCtx.shadowBlur = 10;

        const flameY = top + shipH;
        const leftJetX = centerX - shipW * 0.18;
        const rightJetX = centerX + shipW * 0.12;
        const flameH = px * (1.6 + thrustPulse * 2.5);

        renderCtx.fillRect(leftJetX, flameY, px * 1.1, flameH);
        renderCtx.fillRect(rightJetX, flameY, px * 1.1, flameH * 0.86);
      }

      renderCtx.restore();
    }

    function drawProjectiles() {
      if (!projectiles.length) return;

      renderCtx.save();
      for (let i = 0; i < projectiles.length; i += 1) {
        const p = projectiles[i];
        const alpha = clamp(p.life * 1.8, 0, 1);

        renderCtx.globalAlpha = alpha;
        renderCtx.fillStyle = p.color;
        renderCtx.shadowColor = "rgba(255,245,175,0.95)";
        renderCtx.shadowBlur = 12;

        renderCtx.fillRect(p.x - p.size * 0.5, p.y - 12, p.size, 14);
        renderCtx.fillRect(p.x - p.size, p.y - 2, p.size * 2, 3);
      }
      renderCtx.restore();
    }

    function drawParticles() {
      if (!particles.length) return;

      renderCtx.save();
      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        const lifeRatio = clamp(particle.life / particle.maxLife, 0, 1);

        renderCtx.globalAlpha = lifeRatio;
        renderCtx.fillStyle = particle.color;
        renderCtx.shadowColor = particle.color;
        renderCtx.shadowBlur = 8 * lifeRatio;

        renderCtx.fillRect(
          particle.x - particle.size * 0.5,
          particle.y - particle.size * 0.5,
          particle.size,
          particle.size
        );
      }
      renderCtx.restore();
    }

    function updateCombat(deltaSec: number, W: number, H: number, time: number) {
      for (let i = 0; i < invaders.length; i += 1) {
        const invader = invaders[i];

        if (!invader.alive) {
          invader.respawnTimer -= deltaSec;

          if (invader.respawnTimer <= 0) {
            const fresh = spawnInvader(invader.spriteIdx, false);
            Object.assign(invader, fresh);
          }
          continue;
        }

        invader.x += invader.vx * deltaSec;

        const margin = 0.24;
        if (invader.vx > 0 && invader.x > 1 + margin) {
          invader.x = -margin;
          invader.y = 0.12 + Math.random() * 0.42;
        } else if (invader.vx < 0 && invader.x < -margin) {
          invader.x = 1 + margin;
          invader.y = 0.12 + Math.random() * 0.42;
        }
      }

      if (prefersReducedMotion) {
        return;
      }

      ship.repathCooldown -= deltaSec;
      if (ship.repathCooldown <= 0) {
        const aliveInvaders = invaders.filter((invader) => invader.alive);

        if (aliveInvaders.length && Math.random() < 0.72) {
          const target = aliveInvaders[Math.floor(Math.random() * aliveInvaders.length)];
          ship.targetX = clamp(target.x + (Math.random() - 0.5) * 0.08, 0.08, 0.92);
        } else {
          ship.targetX = 0.08 + Math.random() * 0.84;
        }

        ship.repathCooldown = 0.55 + Math.random() * 0.9;
      }

      ship.x += (ship.targetX - ship.x) * Math.min(1, deltaSec * 3.2);
      ship.x = clamp(ship.x, 0.06, 0.94);

      ship.fireCooldown -= deltaSec;
      if (ship.fireCooldown <= 0) {
        const shipPixel = Math.max(1, Math.min(W, H) / 140);
        const shipWidth = SHIP_SPRITE[0].length * shipPixel;
        const shipHeight = SHIP_SPRITE.length * shipPixel;
        const shipLeft = ship.x * W - shipWidth * 0.5;
        const shipTop = ship.y * H - shipHeight * 0.5;
        const muzzleX = shipLeft + (SHIP_TIP_COL + 0.5) * shipPixel;
        const muzzleY = shipTop - shipPixel * 0.25;

        projectiles.push({
          x: muzzleX,
          y: muzzleY,
          vy: -(250 + Math.random() * 120),
          size: 1.8 + Math.random() * 1.1,
          life: 2.3,
          color: "#ffe98a",
        });

        ship.fireCooldown = 0.22 + Math.random() * 0.48;
      }

      for (let i = projectiles.length - 1; i >= 0; i -= 1) {
        const projectile = projectiles[i];
        projectile.y += projectile.vy * deltaSec;
        projectile.life -= deltaSec;

        if (projectile.life <= 0 || projectile.y < -20) {
          projectiles.splice(i, 1);
          continue;
        }

        let hitInvader: Invader | null = null;
        let hitPose: InvaderPose | null = null;

        for (let j = 0; j < invaders.length; j += 1) {
          const invader = invaders[j];
          if (!invader.alive) continue;

          const pose = getInvaderPose(invader, W, H, time);
          if (!pose) continue;

          const pad = 2;
          const hit =
            projectile.x >= pose.left - pad &&
            projectile.x <= pose.left + pose.width + pad &&
            projectile.y >= pose.top - pad &&
            projectile.y <= pose.top + pose.height + pad;

          if (hit) {
            hitInvader = invader;
            hitPose = pose;
            break;
          }
        }

        if (hitInvader && hitPose) {
          spawnInvaderExplosion(hitPose);

          hitInvader.alive = false;
          hitInvader.respawnTimer = 1.1 + Math.random() * 1.9;

          projectiles.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        const particle = particles[i];

        particle.x += particle.vx * deltaSec;
        particle.y += particle.vy * deltaSec;
        particle.vx *= 1 - Math.min(0.92, deltaSec * 1.8);
        particle.vy += 28 * deltaSec;
        particle.life -= deltaSec;

        if (particle.life <= 0) {
          particles.splice(i, 1);
        }
      }
    }

    let lastNowMs = performance.now();
    let lastW = runtime.getWidth();
    let lastH = runtime.getHeight();

    function draw(nowMs: number) {
      rafRef.current = requestAnimationFrame(draw);

      const elapsedSec = Math.min(0.05, Math.max(1 / 240, (nowMs - lastNowMs) / 1000 || 1 / 60));
      lastNowMs = nowMs;

      if (!runtime.shouldRender(nowMs)) return;

      const frameStart = performance.now();
      const t = nowMs / 1000;
      const W = runtime.getWidth();
      const H = runtime.getHeight();
      if (W <= 0 || H <= 0) return;

      if (W !== lastW || H !== lastH) {
        lastW = W;
        lastH = H;
        initStars(W, H);
      }

      const horizonY = H * 0.63;

      updateCombat(elapsedSec, W, H, t);

      const sky = renderCtx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, "#05040f");
      sky.addColorStop(0.45, "#1d0e38");
      sky.addColorStop(0.72, "#170a2a");
      sky.addColorStop(1, "#0a0617");
      renderCtx.fillStyle = sky;
      renderCtx.fillRect(0, 0, W, H);

      drawSun(W, H, t);

      for (let i = 0; i < stars.length; i += 1) {
        const s = stars[i];
        const twinkle = prefersReducedMotion ? 0.75 : 0.45 + 0.55 * Math.sin(t * (1.8 + s.speed) + s.twinkle);

        renderCtx.fillStyle = `rgba(200,240,255,${(0.24 + twinkle * 0.56).toFixed(3)})`;
        renderCtx.fillRect(s.x, s.y, s.size, s.size);
      }

      const nearHorizonGlow = renderCtx.createLinearGradient(0, horizonY - 10, 0, horizonY + 38);
      nearHorizonGlow.addColorStop(0, "rgba(255,115,188,0)");
      nearHorizonGlow.addColorStop(1, "rgba(255,115,188,0.14)");
      renderCtx.fillStyle = nearHorizonGlow;
      renderCtx.fillRect(0, horizonY - 10, W, 48);

      drawGrid(W, H, t, horizonY);

      const horizonFog = renderCtx.createLinearGradient(0, horizonY - H * 0.08, 0, H);
      horizonFog.addColorStop(0, "rgba(195,70,255,0.12)");
      horizonFog.addColorStop(0.45, "rgba(120,25,170,0.1)");
      horizonFog.addColorStop(1, "rgba(0,0,0,0)");
      renderCtx.fillStyle = horizonFog;
      renderCtx.fillRect(0, horizonY - H * 0.08, W, H - horizonY + H * 0.08);

      const invaderOrder = invaders
        .filter((invader) => invader.alive)
        .sort((a, b) => a.y - b.y);
      for (let i = 0; i < invaderOrder.length; i += 1) {
        drawInvader(invaderOrder[i], W, H, t);
      }

      drawProjectiles();
      drawParticles();
      drawShip(W, H, t);

      const scanlineStart = Math.max(0, Math.floor(horizonY - H * 0.03));
      renderCtx.fillStyle = "rgba(255,255,255,0.024)";
      for (let y = scanlineStart; y < H; y += 4) {
        renderCtx.fillRect(0, y, W, 1);
      }

      const vignette = renderCtx.createRadialGradient(
        W * 0.5,
        H * 0.55,
        H * 0.08,
        W * 0.5,
        H * 0.55,
        H * 0.85
      );
      vignette.addColorStop(0, "rgba(0,0,0,0)");
      vignette.addColorStop(1, "rgba(0,0,0,0.4)");
      renderCtx.fillStyle = vignette;
      renderCtx.fillRect(0, 0, W, H);

      runtime.recordFrame(performance.now() - frameStart);
    }

    initStars(lastW || 1, lastH || 1);
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      runtime.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      style={{ zIndex: 0 }}
    />
  );
}
