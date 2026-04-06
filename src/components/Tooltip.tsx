"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  /** Preferred placement. Will flip if there isn't enough space. */
  placement?: "top" | "bottom" | "left" | "right";
  /** Optional extra width cap (px). Default 240. */
  maxWidth?: number;
}

export default function Tooltip({
  content,
  children,
  placement = "top",
  maxWidth = 240,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [arrowSide, setArrowSide] = useState<"top" | "bottom" | "left" | "right">("bottom");
  const triggerRef = useRef<HTMLElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const GAP = 10; // px between trigger and tooltip box

  const position = useCallback(() => {
    const trigger = triggerRef.current;
    const tip = tooltipRef.current;
    if (!trigger || !tip) return;

    const tr = trigger.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Try placements in priority order
    const orderedPlacements: Array<"top" | "bottom" | "left" | "right"> = [
      placement,
      placement === "top" ? "bottom" : placement === "bottom" ? "top" : placement === "left" ? "right" : "left",
      "top",
      "bottom",
    ];

    for (const p of orderedPlacements) {
      let x = 0, y = 0;

      if (p === "top") {
        x = tr.left + tr.width / 2 - tw / 2;
        y = tr.top - th - GAP;
        if (y >= 4 && x >= 4 && x + tw <= vw - 4) {
          setCoords({ x, y });
          setArrowSide("bottom");
          return;
        }
      } else if (p === "bottom") {
        x = tr.left + tr.width / 2 - tw / 2;
        y = tr.bottom + GAP;
        if (y + th <= vh - 4 && x >= 4 && x + tw <= vw - 4) {
          setCoords({ x, y });
          setArrowSide("top");
          return;
        }
      } else if (p === "left") {
        x = tr.left - tw - GAP;
        y = tr.top + tr.height / 2 - th / 2;
        if (x >= 4 && y >= 4 && y + th <= vh - 4) {
          setCoords({ x, y });
          setArrowSide("right");
          return;
        }
      } else if (p === "right") {
        x = tr.right + GAP;
        y = tr.top + tr.height / 2 - th / 2;
        if (x + tw <= vw - 4 && y >= 4 && y + th <= vh - 4) {
          setCoords({ x, y });
          setArrowSide("left");
          return;
        }
      }
    }

    // Fallback: above, clamped
    const x = Math.min(Math.max(tr.left + tr.width / 2 - tw / 2, 4), vw - tw - 4);
    const y = Math.max(tr.top - th - GAP, 4);
    setCoords({ x, y });
    setArrowSide("bottom");
  }, [placement]);

  useEffect(() => {
    if (visible) {
      // Position on next frame after tooltip renders
      const raf = requestAnimationFrame(position);
      return () => cancelAnimationFrame(raf);
    }
  }, [visible, position]);

  const show = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(false), 80);
  }, []);

  // Wrap in a span so we can attach the ref without touching the child's props
  const child = children;
  const trigger = (
    <span
      ref={triggerRef as React.Ref<HTMLSpanElement>}
      style={{ display: "inline-flex" }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {child}
    </span>
  );

  // Arrow styles
  const arrowSize = 6;
  const arrowStyle: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    pointerEvents: "none",
  };

  if (arrowSide === "bottom") {
    Object.assign(arrowStyle, {
      bottom: -arrowSize,
      left: "50%",
      transform: "translateX(-50%)",
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderTop: `${arrowSize}px solid rgba(30,30,40,0.97)`,
    });
  } else if (arrowSide === "top") {
    Object.assign(arrowStyle, {
      top: -arrowSize,
      left: "50%",
      transform: "translateX(-50%)",
      borderLeft: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid rgba(30,30,40,0.97)`,
    });
  } else if (arrowSide === "right") {
    Object.assign(arrowStyle, {
      right: -arrowSize,
      top: "50%",
      transform: "translateY(-50%)",
      borderTop: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid transparent`,
      borderLeft: `${arrowSize}px solid rgba(30,30,40,0.97)`,
    });
  } else {
    Object.assign(arrowStyle, {
      left: -arrowSize,
      top: "50%",
      transform: "translateY(-50%)",
      borderTop: `${arrowSize}px solid transparent`,
      borderBottom: `${arrowSize}px solid transparent`,
      borderRight: `${arrowSize}px solid rgba(30,30,40,0.97)`,
    });
  }

  const tooltip =
    visible && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            onMouseEnter={show}
            onMouseLeave={hide}
            style={{
              position: "fixed",
              left: coords.x,
              top: coords.y,
              zIndex: 9999,
              maxWidth,
              pointerEvents: "auto",
              // Animate in
              opacity: coords.x === 0 && coords.y === 0 ? 0 : 1,
              transition: "opacity 0.12s ease",
            }}
          >
            <div
              style={{
                position: "relative",
                backgroundColor: "rgba(18,18,28,0.97)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 10,
                padding: "8px 12px",
                boxShadow:
                  "0 4px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
                color: "#e4e4e7",
                fontSize: 13,
                lineHeight: "1.45",
                fontWeight: 400,
                whiteSpace: "normal",
                userSelect: "none",
              }}
            >
              {content}
              <span style={arrowStyle} />
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {trigger}
      {tooltip}
    </>
  );
}
