"use client";

import { useEffect, useState, useRef } from "react";

/* ─────────────────────────────────────────────────────────────────────────────
   Change LAUNCH_DATE to the actual planned launch date/time (UTC).
   This is the only value you need to edit to update the countdown target.
───────────────────────────────────────────────────────────────────────────── */
const LAUNCH_DATE = new Date("2026-05-01T00:00:00Z");

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getTimeLeft() {
  const diff = LAUNCH_DATE.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  const totalSecs = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSecs / 86400),
    hours: Math.floor((totalSecs % 86400) / 3600),
    minutes: Math.floor((totalSecs % 3600) / 60),
    seconds: totalSecs % 60,
  };
}

export default function ComingSoonPage() {
  const [time, setTime] = useState(getTimeLeft());
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setStatus("success");
      setMessage(data.message || "You're on the list!");
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const units = [
    { label: "DAYS",    value: time.days },
    { label: "HOURS",   value: time.hours },
    { label: "MINUTES", value: time.minutes },
    { label: "SECONDS", value: time.seconds },
  ];

  const launched = time.days === 0 && time.hours === 0 && time.minutes === 0 && time.seconds === 0;

  return (
    <div style={{
      backgroundColor: "#010101",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 20px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background grid + orbs */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "radial-gradient(circle, rgba(255,208,0,0.35) 1px, transparent 1px)",
          backgroundSize: "32px 32px", opacity: 0.12,
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 90% 70% at 50% 50%, transparent 30%, #010101 100%)",
        }} />
        <div style={{
          position: "absolute", top: "10%", left: "8%", width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,208,0,0.1) 0%, transparent 70%)",
          filter: "blur(2px)",
          animation: "orb1 22s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "12%", right: "6%", width: 380, height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(56,145,166,0.1) 0%, transparent 70%)",
          animation: "orb2 28s ease-in-out infinite",
        }} />
      </div>

      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(30px,20px)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-25px,15px)} }
        @keyframes pulse-dot { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes tick { 0%{transform:scale(1.06)} 100%{transform:scale(1)} }
      `}</style>

      <div style={{ position: "relative", maxWidth: 680, width: "100%", textAlign: "center" }}>

        {/* Logo mark */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
          <img src="/images/puzzle_warz_logo.png" alt="PuzzleWarz" style={{ height: 32, width: "auto" }} />
          <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#FFD700" }}>
            PuzzleWarz
          </span>
        </div>

        {/* Live badge */}
        <div style={{ marginBottom: 24, display: "flex", justifyContent: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "5px 14px", borderRadius: 999,
            background: "rgba(255,208,0,0.07)", border: "1px solid rgba(255,208,0,0.22)",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%", background: "#FFD700",
              animation: "pulse-dot 1.6s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FFD700" }}>
              {launched ? "We're Live!" : "The File Opens May 1st"}
            </span>
          </div>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(40px,10vw,88px)", fontWeight: 900, lineHeight: 0.95,
          letterSpacing: "-0.04em", color: "#fff", margin: "0 0 16px",
        }}>
          THE FILE<br />
          <span style={{
            background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            OPENS.
          </span>
        </h1>
        <p style={{ color: "#6B7280", fontSize: 16, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 48px" }}>
          Daily logic puzzles. Head-to-head battles. Season arcs.<br />
          Be first in line when we go live.
        </p>

        {/* Countdown */}
        {!launched ? (
          <div style={{
            display: "flex", justifyContent: "center", gap: "clamp(10px,3vw,24px)",
            marginBottom: 52,
          }}>
            {units.map(({ label, value }) => (
              <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{
                  minWidth: "clamp(64px,14vw,90px)",
                  padding: "12px 6px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.09)",
                }}>
                  <span style={{
                    display: "block",
                    fontSize: "clamp(28px,7vw,52px)",
                    fontWeight: 900,
                    fontFamily: "ui-monospace, monospace",
                    color: "#FFD700",
                    letterSpacing: "-0.02em",
                    lineHeight: 1,
                    animation: label === "SECONDS" ? "tick 0.5s ease" : undefined,
                  }}>
                    {pad(value)}
                  </span>
                </div>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", color: "#374151", textTransform: "uppercase" as const }}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginBottom: 52, fontSize: 28, fontWeight: 800, color: "#FFD700" }}>
            🎉 We&apos;re live — go play!
          </div>
        )}

        {/* Email form */}
        <div style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16, padding: "28px 28px",
          marginBottom: 24,
        }}>
          {status === "success" ? (
            <div style={{ textAlign: "center", padding: "10px 0" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>✅</div>
              <p style={{ color: "#39D46E", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>You&apos;re on the list!</p>
              <p style={{ color: "#6B7280", fontSize: 14 }}>{message}</p>
            </div>
          ) : (
            <>
              <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>
                Drop your email and we&apos;ll ping you the moment the first file drops.
              </p>
              <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8, flexWrap: "wrap" as const }}>
                <input
                  ref={inputRef}
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    flex: 1, minWidth: 200,
                    padding: "12px 16px", borderRadius: 8,
                    background: "rgba(255,255,255,0.05)",
                    border: status === "error" ? "1px solid rgba(248,113,113,0.5)" : "1px solid rgba(255,255,255,0.12)",
                    color: "#f3f4f6", fontSize: 14, outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = "rgba(255,208,0,0.45)")}
                  onBlur={e => (e.currentTarget.style.borderColor = status === "error" ? "rgba(248,113,113,0.5)" : "rgba(255,255,255,0.12)")}
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  style={{
                    padding: "12px 28px", borderRadius: 8,
                    background: status === "loading" ? "rgba(255,208,0,0.5)" : "#FFD700",
                    color: "#000", fontWeight: 800, fontSize: 14,
                    border: "none", cursor: status === "loading" ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em", whiteSpace: "nowrap",
                    transition: "background 0.15s",
                  }}
                >
                  {status === "loading" ? "Saving…" : "Notify Me"}
                </button>
              </form>
              {status === "error" && (
                <p style={{ color: "#f87171", fontSize: 13, marginTop: 10 }}>{message}</p>
              )}
              <p style={{ color: "#374151", fontSize: 12, marginTop: 12 }}>
                No spam. One email, when we launch.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <p style={{ color: "#2d3748", fontSize: 12 }}>
          &copy; {new Date().getFullYear()} PuzzleWarz · All rights reserved
        </p>
      </div>
    </div>
  );
}
