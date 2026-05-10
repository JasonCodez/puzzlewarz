"use client";

import { useEffect, useRef, useState } from "react";

const CHRISTMAS_VIDEO_SRC = "/video/canva_christmas.mp4?v=20260510c";
const CROSSFADE_SEC = 0.28;

/**
 * Christmas/Ice background backed by user-provided MP4.
 * Uses two instances of the same clip and crossfades end-to-start for seamless repeat.
 */
export default function IceBackground() {
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const blendVideoRef = useRef<HTMLVideoElement>(null);
  const monitorRafRef = useRef<number>(0);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (videoFailed) return;

    const primary = primaryVideoRef.current;
    const blend = blendVideoRef.current;
    if (!primary || !blend) return;

    let isDestroyed = false;
    let active: "primary" | "blend" = "primary";
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

    const getVideo = (which: "primary" | "blend") =>
      which === "primary" ? primary : blend;

    const setLayerOrder = (top: HTMLVideoElement, bottom: HTMLVideoElement) => {
      top.style.zIndex = "2";
      bottom.style.zIndex = "1";
    };

    const stopMonitor = () => {
      monitorActive = false;
      cancelAnimationFrame(monitorRafRef.current);
    };

    const monitorLoop = () => {
      if (isDestroyed || !monitorActive || prefersReducedMotion) return;

      const currentKey = active;
      const nextKey = currentKey === "primary" ? "blend" : "primary";
      const currentVideo = getVideo(currentKey);
      const nextVideo = getVideo(nextKey);

      const duration = Number.isFinite(currentVideo.duration) ? currentVideo.duration : 0;

      if (duration > 0) {
        const fadeWindow = Math.min(CROSSFADE_SEC, Math.max(0.2, duration * 0.35));
        const fadeStart = Math.max(0, duration - fadeWindow);
        const t = currentVideo.currentTime;

        if (t >= fadeStart && t < duration) {
          if (!crossfading) {
            crossfading = true;
            setLayerOrder(nextVideo, currentVideo);
            nextVideo.currentTime = 0;
            nextVideo.style.opacity = "0";
            currentVideo.style.opacity = "1";
            void playSilently(nextVideo);
          }

          const progress = Math.max(0, Math.min(1, (t - fadeStart) / fadeWindow));
          currentVideo.style.opacity = "1";
          nextVideo.style.opacity = progress.toFixed(3);
        } else if (!crossfading) {
          setLayerOrder(currentVideo, nextVideo);
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
          setLayerOrder(nextVideo, currentVideo);

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
        primary.pause();
        blend.pause();
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

    configure(primary);
    configure(blend);

    primary.style.opacity = "1";
    blend.style.opacity = "0";
    setLayerOrder(primary, blend);
    blend.currentTime = 0;
    blend.pause();

    primary.addEventListener("error", onError);
    blend.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (prefersReducedMotion) {
      primary.pause();
      blend.pause();
      primary.currentTime = 0;
      blend.currentTime = 0;
    } else {
      void playSilently(primary);
      startMonitor();
    }

    return () => {
      isDestroyed = true;
      stopMonitor();
      primary.removeEventListener("error", onError);
      blend.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      primary.pause();
      blend.pause();
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
        background: "#031329",
      }}
    >
      {!videoFailed && (
        <>
          <video
            ref={primaryVideoRef}
            src={CHRISTMAS_VIDEO_SRC}
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
              opacity: 1,
              zIndex: 2,
              filter: "saturate(1.1) contrast(1.06) brightness(1.02)",
              willChange: "transform, opacity",
            }}
          />
          <video
            ref={blendVideoRef}
            src={CHRISTMAS_VIDEO_SRC}
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
              opacity: 0,
              zIndex: 1,
              filter: "saturate(1.1) contrast(1.06) brightness(1.02)",
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
            "radial-gradient(120% 80% at 50% 65%, rgba(186,230,253,0.14), rgba(0,0,0,0) 65%), linear-gradient(180deg, rgba(2,16,36,0.16), rgba(2,16,36,0.28))",
        }}
      />
    </div>
  );
}
