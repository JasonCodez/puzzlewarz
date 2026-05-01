"use client";

import { useEffect, useRef } from "react";

const LAVA_VIDEO_SRC = "/video/lava_flow.mp4?v=20260430a";
const LAVA_POSTER_SRC = "/images/lava_flow.png?v=20260430b";
const LOOP_IN_SEC = 0.06;
const LOOP_OUT_PAD_SEC = 0.12;

/**
 * Lava background backed by an MP4.
 * Uses a single video layer and trims loop edges to avoid visible pulse/flicker.
 */
export default function LavaBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let isDestroyed = false;
    let monitorActive = false;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const playSilently = async (video: HTMLVideoElement) => {
      try {
        await video.play();
      } catch {
        // Autoplay can fail in some environments; keep poster fallback visible.
      }
    };

    const configureVideo = (video: HTMLVideoElement) => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.loop = false;
      video.playbackRate = 1;
      video.currentTime = 0;
    };

    configureVideo(video);

    const stopMonitor = () => {
      monitorActive = false;
      cancelAnimationFrame(rafRef.current);
    };

    const monitorLoop = () => {
      if (isDestroyed || !monitorActive || prefersReducedMotion) return;

      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (duration > LOOP_IN_SEC + LOOP_OUT_PAD_SEC + 0.1) {
        const loopOut = duration - LOOP_OUT_PAD_SEC;
        if (video.currentTime >= loopOut) {
          // Skip back to an in-point to avoid decode flash at exact frame 0.
          video.currentTime = LOOP_IN_SEC;
          if (video.paused) {
            void playSilently(video);
          }
        }
      }

      rafRef.current = requestAnimationFrame(monitorLoop);
    };

    const startMonitor = () => {
      if (prefersReducedMotion || monitorActive) return;
      monitorActive = true;
      rafRef.current = requestAnimationFrame(monitorLoop);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stopMonitor();
        video.pause();
        return;
      }
      if (!prefersReducedMotion) {
        void playSilently(video);
        startMonitor();
      }
    };

    const onLoadedMetadata = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      if (prefersReducedMotion || duration <= 0) return;
      if (duration > LOOP_IN_SEC + LOOP_OUT_PAD_SEC + 0.1 && video.currentTime < LOOP_IN_SEC) {
        video.currentTime = LOOP_IN_SEC;
      }
    };

    const onEnded = () => {
      if (prefersReducedMotion) return;
      video.currentTime = LOOP_IN_SEC;
      void playSilently(video);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("ended", onEnded);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (prefersReducedMotion) {
      video.pause();
      video.currentTime = 0;
    } else {
      void playSilently(video);
      startMonitor();
    }

    return () => {
      isDestroyed = true;
      stopMonitor();
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      video.pause();
    };
  }, []);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: "#110200",
      }}
    >
      <video
        ref={videoRef}
        src={LAVA_VIDEO_SRC}
        poster={LAVA_POSTER_SRC}
        muted
        playsInline
        autoPlay
        preload="auto"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scale(1.03)",
          filter: "saturate(1.08) contrast(1.04)",
          willChange: "transform",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(110% 80% at 50% 100%, rgba(255,128,38,0.16), rgba(0,0,0,0) 66%), radial-gradient(120% 90% at 50% 0%, rgba(255,150,80,0.1), rgba(0,0,0,0) 62%)",
        }}
      />
    </div>
  );
}
