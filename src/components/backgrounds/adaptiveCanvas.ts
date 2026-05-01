"use client";

export interface AdaptiveCanvasOptions {
  desktopScale?: number;
  mobileScale?: number;
  minScale?: number;
  maxScale?: number;
  targetFpsDesktop?: number;
  targetFpsMobile?: number;
  upscaleThresholdMs?: number;
  downscaleThresholdMs?: number;
  adjustCooldownMs?: number;
}

export interface AdaptiveCanvasRuntime {
  ctx: CanvasRenderingContext2D;
  offscreen: HTMLCanvasElement;
  offCtx: CanvasRenderingContext2D;
  resize: () => void;
  shouldRender: (now: number) => boolean;
  recordFrame: (frameCostMs: number) => void;
  getWidth: () => number;
  getHeight: () => number;
  getScale: () => number;
  dispose: () => void;
}

export function createAdaptiveCanvasRuntime(
  canvas: HTMLCanvasElement,
  opts: AdaptiveCanvasOptions = {}
): AdaptiveCanvasRuntime {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2D context for canvas background");
  }

  const offscreen = document.createElement("canvas");
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) {
    throw new Error("Failed to get 2D context for offscreen canvas");
  }

  const desktopScale = opts.desktopScale ?? 3;
  const mobileScale = opts.mobileScale ?? 4;
  const minScale = opts.minScale ?? 2;
  const maxScale = opts.maxScale ?? 6;
  const targetFpsDesktop = opts.targetFpsDesktop ?? 60;
  const targetFpsMobile = opts.targetFpsMobile ?? 30;
  const upscaleThresholdMs = opts.upscaleThresholdMs ?? 9;
  const downscaleThresholdMs = opts.downscaleThresholdMs ?? 19;
  const adjustCooldownMs = opts.adjustCooldownMs ?? 1400;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isCompactDevice =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    (window.matchMedia("(max-width: 768px)").matches ||
      window.matchMedia("(pointer: coarse)").matches);

  let qualityScale = isCompactDevice ? mobileScale : desktopScale;
  qualityScale = Math.max(minScale, Math.min(maxScale, qualityScale));

  let fpsCap = prefersReducedMotion
    ? Math.min(24, targetFpsMobile)
    : isCompactDevice
    ? targetFpsMobile
    : targetFpsDesktop;

  let width = 0;
  let height = 0;
  let tabVisible = typeof document === "undefined" ? true : document.visibilityState === "visible";
  let inViewport = true;
  let lastRenderAt = 0;
  let frameEmaMs = isCompactDevice ? 16 : 12;
  let lastAdjustAt = 0;

  const resize = () => {
    const parent = canvas.parentElement;
    const nextW =
      parent?.clientWidth ||
      parent?.offsetWidth ||
      (typeof window !== "undefined" ? window.innerWidth : 400) ||
      400;
    const nextH =
      parent?.clientHeight ||
      parent?.offsetHeight ||
      (typeof window !== "undefined" ? Math.max(320, Math.floor(window.innerHeight * 0.7)) : 600) ||
      600;

    width = Math.max(1, Math.floor(nextW));
    height = Math.max(1, Math.floor(nextH));

    canvas.width = width;
    canvas.height = height;

    offscreen.width = Math.max(1, Math.ceil(width / qualityScale));
    offscreen.height = Math.max(1, Math.ceil(height / qualityScale));
  };

  const handleVisibility = () => {
    tabVisible = document.visibilityState === "visible";
  };

  resize();

  const resizeObserver = new ResizeObserver(() => {
    resize();
  });
  if (canvas.parentElement) {
    resizeObserver.observe(canvas.parentElement);
  }

  const intersectionObserver = new IntersectionObserver(
    (entries) => {
      inViewport = entries[0]?.isIntersecting ?? true;
    },
    { threshold: 0.01 }
  );
  intersectionObserver.observe(canvas);

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibility);
  }

  const shouldRender = (now: number) => {
    if (!tabVisible || !inViewport) return false;
    const frameInterval = fpsCap > 0 ? 1000 / fpsCap : 0;
    if (frameInterval > 0 && now - lastRenderAt < frameInterval) return false;
    lastRenderAt = now;
    return true;
  };

  const recordFrame = (frameCostMs: number) => {
    frameEmaMs = frameEmaMs * 0.9 + frameCostMs * 0.1;
    const now = performance.now();
    if (now - lastAdjustAt < adjustCooldownMs) return;

    lastAdjustAt = now;

    // If frame cost is too high, lower detail by increasing scale.
    if (frameEmaMs > downscaleThresholdMs && qualityScale < maxScale) {
      qualityScale += 1;
      resize();
      return;
    }

    // If frame cost is comfortably low, increase detail by reducing scale.
    if (frameEmaMs < upscaleThresholdMs && qualityScale > minScale) {
      qualityScale -= 1;
      resize();
      return;
    }

    // Coarse FPS adaptation helps very weak devices without turning effects off.
    if (!prefersReducedMotion) {
      if (frameEmaMs > 26) {
        fpsCap = Math.min(fpsCap, 24);
      } else if (frameEmaMs > 18) {
        fpsCap = Math.min(fpsCap, isCompactDevice ? 30 : 45);
      } else {
        fpsCap = isCompactDevice ? targetFpsMobile : targetFpsDesktop;
      }
    }
  };

  const dispose = () => {
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };

  return {
    ctx,
    offscreen,
    offCtx,
    resize,
    shouldRender,
    recordFrame,
    getWidth: () => width,
    getHeight: () => height,
    getScale: () => qualityScale,
    dispose,
  };
}
