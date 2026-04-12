"use client";

/**
 * AvatarFrame — conic-gradient spinning ring frame for avatars.
 *
 * Uses a spinning conic-gradient border with a counter-spinning inner
 * container so the avatar stays upright while the frame rotates smoothly.
 * No pageBg gap — the ring hugs the avatar edge cleanly.
 */

import React from "react";

export interface FrameConfig {
  colorA: string;
  colorB: string;
  glow: string;
}

interface AvatarFrameProps {
  frame: FrameConfig;
  size: number;          // pixel size of the outer wrapper (e.g. 80 or 96)
  strokeWidth?: number;  // ring thickness in px, default 4
  pageBg?: string;       // kept for API compatibility, no longer used
  className?: string;
  children: React.ReactNode;
}

export default function AvatarFrame({
  frame,
  size,
  strokeWidth = 4,
  className = "",
  children,
}: AvatarFrameProps) {
  const padding = strokeWidth + 1;

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Pulsing glow layer — separate so it never affects avatar opacity */}
      <div
        style={{
          position: "absolute",
          inset: -2,
          borderRadius: "9999px",
          boxShadow: frame.glow,
          animation: "af-pulse 2.4s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Spinning conic-gradient ring */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "9999px",
          padding,
          background: `conic-gradient(
            ${frame.colorA} 0deg,
            ${frame.colorB} 90deg,
            rgba(255,255,255,0.92) 155deg,
            ${frame.colorB} 220deg,
            ${frame.colorA} 300deg,
            ${frame.colorB} 360deg
          )`,
          animation: "af-spin 3.6s linear infinite",
        }}
      >
        {/* Counter-spin keeps avatar content visually stationary */}
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "9999px",
            overflow: "hidden",
            animation: "af-counter-spin 3.6s linear infinite",
          }}
        >
          {children}
        </div>
      </div>

      <style>{`
        @keyframes af-spin         { to { transform: rotate(360deg);  } }
        @keyframes af-counter-spin { to { transform: rotate(-360deg); } }
        @keyframes af-pulse        { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
