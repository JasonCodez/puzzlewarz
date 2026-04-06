"use client";

/**
 * AvatarFrame — SVG-based animated ring frame for avatars.
 *
 * Renders three concentric SVG circle strokes:
 *  1. A dim base ring (always visible, no animation)
 *  2. A full spinning gradient ring (strokeDashoffset rotation via CSS)
 *  3. A bright sweeping highlight arc (shorter dash, faster spin, glow filter)
 *
 * The child content (image / fallback) sits in an absolutely-positioned
 * div inside the same wrapper — completely isolated from the SVG layer.
 */

import React, { useId } from "react";

export interface FrameConfig {
  colorA: string;
  colorB: string;
  glow: string;
}

interface AvatarFrameProps {
  frame: FrameConfig;
  size: number;          // pixel size of the outer wrapper (e.g. 80 or 96)
  strokeWidth?: number;  // ring thickness in px, default 4
  pageBg?: string;       // background colour under the avatar (for gap ring)
  className?: string;
  children: React.ReactNode;
}

export default function AvatarFrame({
  frame,
  size,
  strokeWidth = 4,
  pageBg = "#020202",
  className = "",
  children,
}: AvatarFrameProps) {
  const uid = useId().replace(/:/g, "_");
  const half = size / 2;
  // Radius sits in the middle of the stroke so it doesn't clip
  const r = half - strokeWidth / 2 - 1;
  const circumference = 2 * Math.PI * r;

  // IDs for this instance's defs
  const gradId       = `af_grad_${uid}`;
  const filterId     = `af_filter_${uid}`;
  const clipId       = `af_clip_${uid}`;
  const highlightId  = `af_hi_${uid}`;

  // Glow radius for the SVG filter — extract first px value from frame.glow string
  const glowMatch = frame.glow.match(/(\d+)px/);
  const glowBlur  = glowMatch ? Math.min(Number(glowMatch[1]) / 2, 14) : 10;

  return (
    <div
      className={`relative flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* ── SVG ring layer (sits behind the avatar) ── */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 0 }}
        aria-hidden="true"
      >
        <defs>
          {/* Rotating gradient for the main ring */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={frame.colorA} />
            <stop offset="40%"  stopColor={frame.colorB} />
            <stop offset="70%"  stopColor="white" stopOpacity={0.9} />
            <stop offset="100%" stopColor={frame.colorA} />
          </linearGradient>

          {/* Glow filter for the highlight sweep */}
          <filter id={filterId} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={glowBlur * 0.6} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Rotating gradient for the highlight sweep */}
          <linearGradient id={highlightId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="white" stopOpacity={0} />
            <stop offset="50%"  stopColor="white" stopOpacity={0.95} />
            <stop offset="100%" stopColor="white" stopOpacity={0} />
          </linearGradient>

          {/* Clip to a circle so nothing bleeds outside */}
          <clipPath id={clipId}>
            <circle cx={half} cy={half} r={half} />
          </clipPath>
        </defs>

        {/* 1 — Base dim ring */}
        <circle
          cx={half} cy={half} r={r}
          fill="none"
          stroke={frame.colorA}
          strokeWidth={strokeWidth}
          strokeOpacity={0.22}
        />

        {/* 2 — Full spinning gradient ring */}
        <circle
          cx={half} cy={half} r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={{
            transformOrigin: `${half}px ${half}px`,
            animation: "af-spin 3.6s linear infinite",
          }}
        />

        {/* 3 — Short bright highlight sweep */}
        <circle
          cx={half} cy={half} r={r}
          fill="none"
          stroke={frame.colorB}
          strokeWidth={strokeWidth + 1.5}
          strokeLinecap="round"
          strokeDasharray={`${circumference * 0.18} ${circumference * 0.82}`}
          strokeDashoffset={0}
          strokeOpacity={0.9}
          filter={`url(#${filterId})`}
          style={{
            transformOrigin: `${half}px ${half}px`,
            animation: "af-spin 2.4s linear infinite",
          }}
        />
      </svg>

      {/* ── Avatar content (image / fallback) ── */}
      <div
        className="absolute rounded-full overflow-hidden"
        style={{
          inset: strokeWidth + 2,
          zIndex: 1,
          background: pageBg,
        }}
      >
        {children}
      </div>

      {/* Keyframes injected once via a global style tag */}
      <style>{`
        @keyframes af-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
