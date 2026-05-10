"use client";

import { useEffect, useRef, useState } from "react";

const GALAXY_VIDEO_SRC = "/video/canva_galaxy.mp4?v=20260510a";

/**
 * Galaxy background backed by user-provided MP4.
 * Uses a direct loop with no crossfade transition.
 */
export default function GalaxyBackground() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    if (videoFailed) return;

    const video = videoRef.current;
    if (!video) return;

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const playSilently = async () => {
      try {
        await video.play();
      } catch {
        // Autoplay can fail in some environments; fallback still renders.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        video.pause();
        return;
      }

      if (!prefersReducedMotion) {
        void playSilently();
      }
    };

    const onError = () => {
      setVideoFailed(true);
    };

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.loop = true;
    video.playbackRate = 1;

    video.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onVisibilityChange);

    if (prefersReducedMotion) {
      video.pause();
      video.currentTime = 0;
    } else {
      void playSilently();
    }

    return () => {
      video.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      video.pause();
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
        background: "#04001a",
      }}
    >
      {!videoFailed && (
        <video
          ref={videoRef}
          src={GALAXY_VIDEO_SRC}
          muted
          playsInline
          autoPlay
          loop
          preload="auto"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scale(1.03)",
            filter: "saturate(1.1) contrast(1.06) brightness(1.01)",
            willChange: "transform",
          }}
        />
      )}

      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(120% 75% at 50% 60%, rgba(196,150,255,0.14), rgba(0,0,0,0) 64%), linear-gradient(180deg, rgba(10,6,34,0.12), rgba(10,6,34,0.28))",
        }}
      />
    </div>
  );
}
