"use client";

import { useEffect, useRef, useState } from "react";

const NEON_VIDEO_FORWARD_SRC = "/video/canva_neon_skin_video.mp4?v=20260510e";
const NEON_VIDEO_REVERSE_SRC = "/video/canva_neon_skin_video.mp4?v=20260510e";
const CROSSFADE_SEC = 0.42;

/**
 * Neon background backed by user-provided MP4.
 * Uses two synced instances of the same clip to crossfade end-to-start for seamless repeat.
 */
export default function NeonBackground() {
  const forwardVideoRef = useRef<HTMLVideoElement>(null);
  const reverseVideoRef = useRef<HTMLVideoElement>(null);
  const monitorRafRef = useRef<number>(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (videoFailed) return;

    const forward = forwardVideoRef.current;
    const reverse = reverseVideoRef.current;
    if (!forward || !reverse) return;

    let isDestroyed = false;
    let active: "forward" | "reverse" = "forward";
    let monitorActive = false;
    let crossfading = false;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const playSilently = async (video: HTMLVideoElement) => {
      try {
        await video.play();
      } catch {
        // Autoplay can fail in some environments; fallback still renders.
      }
    };

    const configure = (video: HTMLVideoElement) => {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.loop = false;
      video.playbackRate = 1;
    };

    const getVideo = (which: "forward" | "reverse") =>
      which === "forward" ? forward : reverse;

    const setVisible = (video: HTMLVideoElement, visible: boolean) => {
      video.style.opacity = visible ? "1" : "0";
    };

    const stopMonitor = () => {
      monitorActive = false;
      cancelAnimationFrame(monitorRafRef.current);
    };

    const monitorLoop = () => {
      if (isDestroyed || !monitorActive || prefersReducedMotion) return;

      const currentKey = active;
      const nextKey = currentKey === "forward" ? "reverse" : "forward";
      const currentVideo = getVideo(currentKey);
      const nextVideo = getVideo(nextKey);

      const duration = Number.isFinite(currentVideo.duration) ? currentVideo.duration : 0;

      if (duration > 0) {
        const fadeWindow = Math.min(CROSSFADE_SEC, Math.max(0.18, duration * 0.35));
        const fadeStart = Math.max(0, duration - fadeWindow);
        const t = currentVideo.currentTime;

        if (t >= fadeStart && t < duration) {
          if (!crossfading) {
            crossfading = true;
            nextVideo.currentTime = 0;
            void playSilently(nextVideo);
          }

          const progress = Math.max(0, Math.min(1, (t - fadeStart) / fadeWindow));
          currentVideo.style.opacity = (1 - progress).toFixed(3);
          nextVideo.style.opacity = progress.toFixed(3);
        } else if (!crossfading) {
          currentVideo.style.opacity = "1";
          nextVideo.style.opacity = "0";
        }

        if (crossfading && (t >= duration - 0.012 || currentVideo.ended)) {
          currentVideo.pause();
          currentVideo.currentTime = 0;
          currentVideo.style.opacity = "0";

          nextVideo.style.opacity = "1";
          if (nextVideo.paused) {
            void playSilently(nextVideo);
          }

          active = nextKey;
          crossfading = false;
        }
      }

      monitorRafRef.current = requestAnimationFrame(monitorLoop);
    };

    const startMonitor = () => {
      if (prefersReducedMotion || monitorActive) return;
      monitorActive = true;
      monitorRafRef.current = requestAnimationFrame(monitorLoop);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        stopMonitor();
        forward.pause();
        reverse.pause();
        return;
      }

      if (!prefersReducedMotion) {
        void playSilently(getVideo(active));
        startMonitor();
      }
    };

    const onError = () => {
      setVideoFailed(true);
    };

    configure(forward);
    configure(reverse);

    setVisible(forward, true);
    setVisible(reverse, false);
    reverse.currentTime = 0;
    reverse.pause();

    forward.addEventListener("error", onError);
    reverse.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (prefersReducedMotion) {
      forward.pause();
      reverse.pause();
      forward.currentTime = 0;
      reverse.currentTime = 0;
    } else {
      void playSilently(forward);
      startMonitor();
    }

    return () => {
      isDestroyed = true;
      stopMonitor();
      forward.removeEventListener("error", onError);
      reverse.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      forward.pause();
      reverse.pause();
    };
  }, [videoFailed]);

  return (
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        pointerEvents: "none",
        background: "#040b1a",
      }}
    >
      {!videoFailed && (
        <>
          <video
            ref={forwardVideoRef}
            src={NEON_VIDEO_FORWARD_SRC}
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
              transform: "scale(1.035)",
              opacity: 1,
              filter: "saturate(1.22) contrast(1.08) brightness(1.03)",
              willChange: "transform, opacity",
            }}
          />
          <video
            ref={reverseVideoRef}
            src={NEON_VIDEO_REVERSE_SRC}
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
              transform: "scale(1.035)",
              opacity: 0,
              filter: "saturate(1.22) contrast(1.08) brightness(1.03)",
              willChange: "transform, opacity",
            }}
          />
        </>
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 70% at 50% 62%, rgba(0,200,255,0.2), rgba(0,0,0,0) 62%), radial-gradient(140% 100% at 50% 12%, rgba(229,92,255,0.18), rgba(0,0,0,0) 68%), linear-gradient(180deg, rgba(2,8,20,0.14), rgba(2,8,20,0.3))",
        }}
      />
    </div>
  );
}
