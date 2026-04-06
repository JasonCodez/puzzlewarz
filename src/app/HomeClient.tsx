"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

/* ── Animated counter ─────────────────────────────────────── */
function useCountUp(target: number, duration = 2200, trigger = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let startTime: number | null = null;
    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * target));
      if (progress < 1) requestAnimationFrame(step);
      else setCount(target);
    };
    requestAnimationFrame(step);
  }, [target, duration, trigger]);
  return count;
}

/* ── Intersection observer hook ───────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ── Stats row ────────────────────────────────────────────── */
function StatsRow() {
  const { ref, visible } = useReveal(0.3);
  const players = useCountUp(12400, 2000, visible);
  const puzzles = useCountUp(520, 1800, visible);
  const teams = useCountUp(3200, 2100, visible);
  const solved = useCountUp(98600, 2400, visible);

  const stats = [
    { value: players, suffix: "+", label: "Active Players" },
    { value: puzzles, suffix: "+", label: "Puzzles" },
    { value: teams, suffix: "+", label: "Teams Formed" },
    { value: solved, suffix: "+", label: "Puzzles Solved" },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-3xl">
      {stats.map((s, i) => (
        <div
          key={i}
          className="text-center"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(20px)",
            transition: `opacity 0.6s ease ${i * 0.12}s, transform 0.6s ease ${i * 0.12}s`,
          }}
        >
          <div className="text-2xl md:text-3xl font-bold" style={{ color: "#FDE74C" }}>
            {s.value.toLocaleString()}{s.suffix}
          </div>
          <div className="text-xs mt-1 tracking-wide uppercase" style={{ color: "#6B7280" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Feature card ─────────────────────────────────────────── */
interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  accent: "teal" | "gold";
  delay?: number;
  visible?: boolean;
}
function FeatureCard({ icon, title, desc, accent, delay = 0, visible = false }: FeatureCardProps) {
  const [hovered, setHovered] = useState(false);
  const isTeal = accent === "teal";
  const color = isTeal ? "#3891A6" : "#FDE74C";
  const bgAlpha = isTeal ? "rgba(56,145,166,0.07)" : "rgba(253,231,76,0.05)";
  const borderDefault = isTeal ? "rgba(56,145,166,0.25)" : "rgba(253,231,76,0.22)";
  const borderHover = isTeal ? "rgba(56,145,166,0.7)" : "rgba(253,231,76,0.65)";
  const glowColor = isTeal ? "rgba(56,145,166,0.22)" : "rgba(253,231,76,0.15)";

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: bgAlpha,
        border: `1px solid ${hovered ? borderHover : borderDefault}`,
        borderRadius: "16px",
        padding: "28px",
        cursor: "default",
        boxShadow: hovered ? `0 8px 40px ${glowColor}` : "none",
        transform: visible ? (hovered ? "translateY(-6px)" : "translateY(0)") : "translateY(30px)",
        opacity: visible ? 1 : 0,
        transition: `opacity 0.6s ease ${delay}s, transform 0.5s ease ${delay}s, border-color 0.25s, box-shadow 0.25s`,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          fontSize: 22,
          backgroundColor: isTeal ? "rgba(56,145,166,0.15)" : "rgba(253,231,76,0.1)",
          border: `1px solid ${isTeal ? "rgba(56,145,166,0.3)" : "rgba(253,231,76,0.25)"}`,
          transition: "background-color 0.25s",
        }}
      >
        {icon}
      </div>
      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
    </div>
  );
}

/* ── Step card ────────────────────────────────────────────── */
function StepCard({ num, title, desc, delay, visible }: { num: string; title: string; desc: string; delay: number; visible: boolean }) {
  return (
    <div
      style={{
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          backgroundColor: "rgba(56,145,166,0.12)",
          border: "2px solid rgba(56,145,166,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 16px",
          fontSize: 18,
          fontWeight: 800,
          color: "#3891A6",
        }}
      >
        {num}
      </div>
      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 17, marginBottom: 8 }}>{title}</h3>
      <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.6, maxWidth: 220, margin: "0 auto" }}>{desc}</p>
    </div>
  );
}

/* ── Testimonial card ─────────────────────────────────────── */
interface TestimonialProps {
  quote: string;
  name: string;
  sub: string;
  initials: string;
  accent: "teal" | "gold";
  delay: number;
  visible: boolean;
}
function TestimonialCard({ quote, name, sub, initials, accent, delay, visible }: TestimonialProps) {
  const isTeal = accent === "teal";
  return (
    <div
      style={{
        backgroundColor: isTeal ? "rgba(56,145,166,0.06)" : "rgba(253,231,76,0.04)",
        border: `1px solid ${isTeal ? "rgba(56,145,166,0.2)" : "rgba(253,231,76,0.18)"}`,
        borderRadius: 16,
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      <div style={{ color: "#FDE74C", fontSize: 13, letterSpacing: 2 }}>★★★★★</div>
      <p style={{ color: "#DDDBF1", fontSize: 14, lineHeight: 1.7, flexGrow: 1 }}>&ldquo;{quote}&rdquo;</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 13,
            fontWeight: 700,
            flexShrink: 0,
            backgroundColor: isTeal ? "rgba(56,145,166,0.25)" : "rgba(253,231,76,0.15)",
            color: isTeal ? "#9BD1D6" : "#FDE74C",
          }}
        >
          {initials}
        </div>
        <div>
          <p style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{name}</p>
          <p style={{ color: "#555", fontSize: 12 }}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

/* ── Coming-soon teaser card ──────────────────────────────── */
interface ComingSoonCardProps {
  icon: string;
  title: string;
  desc: string;
  accent: string;
  delay: number;
  visible: boolean;
}
function ComingSoonCard({ icon, title, desc, accent, delay, visible }: ComingSoonCardProps) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        backgroundColor: `${accent}08`,
        border: `1px solid ${hovered ? accent + "60" : accent + "25"}`,
        borderRadius: 16,
        padding: "32px 28px",
        cursor: "default",
        overflow: "hidden",
        boxShadow: hovered ? `0 8px 48px ${accent}22` : "none",
        transform: visible ? (hovered ? "translateY(-6px)" : "translateY(0)") : "translateY(30px)",
        opacity: visible ? 1 : 0,
        transition: `opacity 0.6s ease ${delay}s, transform 0.5s ease ${delay}s, border-color 0.25s, box-shadow 0.25s`,
      }}
    >
      {/* Lock overlay pattern */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 120,
          height: 120,
          background: `radial-gradient(circle at 100% 0%, ${accent}15, transparent 70%)`,
          pointerEvents: "none",
        }}
      />
      {/* Coming Soon badge */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          borderRadius: 999,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: accent,
          backgroundColor: `${accent}14`,
          border: `1px solid ${accent}30`,
          animation: "pw-badge-pulse 2.5s ease-in-out infinite",
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }} />
        Coming Soon
      </div>
      {/* Icon */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 18,
          fontSize: 24,
          backgroundColor: `${accent}12`,
          border: `1px solid ${accent}28`,
        }}
      >
        {icon}
      </div>
      <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 18, marginBottom: 10 }}>{title}</h3>
      <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.65 }}>{desc}</p>
    </div>
  );
}

/* ── Main component ───────────────────────────────────────── */
export default function HomeClient() {
  const [heroVisible, setHeroVisible] = useState(false);
  const featuresReveal = useReveal();
  const stepsReveal = useReveal();
  const comingSoonReveal = useReveal();
  const testimonialsReveal = useReveal();
  const ctaReveal = useReveal();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  const features = [
    { icon: "🧩", title: "Progressive Puzzles", desc: "Unlock challenges in stages with smart dependencies. Each solved clue opens a new layer of the mystery.", accent: "teal" as const },
    { icon: "🎯", title: "Solo or Team", desc: "Play solo at your own pace or team up with friends for collaborative, real-time puzzle solving.", accent: "gold" as const },
    { icon: "🏆", title: "Live Leaderboards", desc: "Track your global position in real-time and compete against hundreds of other solvers.", accent: "teal" as const },
    { icon: "⚔️", title: "Warz Battles", desc: "Challenge opponents head-to-head. Wager points on who can crack the same puzzle faster.", accent: "gold" as const },
    { icon: "⚡", title: "Strategic Hints", desc: "Use hints wisely—each one trims your score multiplier. Big brain plays beat the grind.", accent: "teal" as const },
    { icon: "🎖️", title: "Achievements", desc: "Unlock badges, milestones, and streak rewards as you conquer the puzzle universe.", accent: "gold" as const },
  ];

  const testimonials = [
    { quote: "The Warz battles had me up until 3am. My heart was pounding the entire race. Nothing comes close to PuzzleWarz.", name: "Jake R.", sub: "Ranked #12 Global", initials: "JR", accent: "teal" as const },
    { quote: "Our office team has a weekly puzzle night now. The team mode forces you to actually communicate and divide clues. Brilliant.", name: "Sarah M.", sub: "Team Captain · CodeBreakers", initials: "SM", accent: "gold" as const },
    { quote: "The daily challenge is the first thing I open every morning. 47-day streak and counting. The variety keeps it completely fresh.", name: "Alex T.", sub: "47-day streak", initials: "AT", accent: "teal" as const },
    { quote: "Wagering points on a live race is a different kind of rush. Lost my first three Warz then went on a 9-win streak.", name: "Dana K.", sub: "9-win Warz streak", initials: "DK", accent: "gold" as const },
    { quote: "These aren't your typical word searches. They make you think sideways. I've genuinely changed how I analyze information.", name: "Marcus P.", sub: "42 puzzles solved", initials: "MP", accent: "teal" as const },
    { quote: "Free to play, genuinely hard, and the forum community is helpful without spoilers. Already got three friends hooked.", name: "Riley L.", sub: "Forum contributor", initials: "RL", accent: "gold" as const },
  ];

  return (
    <>
      <style>{`
        @keyframes pw-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(60px, -40px) scale(1.08); }
          66%       { transform: translate(-30px, 50px) scale(0.94); }
        }
        @keyframes pw-orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          40%       { transform: translate(-70px, 30px) scale(1.06); }
          70%       { transform: translate(40px, -60px) scale(0.96); }
        }
        @keyframes pw-orb-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%       { transform: translate(50px, 40px) scale(1.1); }
        }
        @keyframes pw-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-12px); }
        }
        @keyframes pw-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253,231,76,0.35); }
          50%       { box-shadow: 0 0 0 8px rgba(253,231,76,0); }
        }
        @keyframes pw-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pw-border-glow {
          0%, 100% { opacity: 0.5; }
          50%       { opacity: 1; }
        }
        @keyframes pw-grid-fade {
          from { opacity: 0; }
          to   { opacity: 0.035; }
        }
        .pw-badge-pulse {
          animation: pw-badge-pulse 2.5s ease-in-out infinite;
        }
        .pw-float {
          animation: pw-float 5s ease-in-out infinite;
        }
        .pw-shimmer-text {
          background: linear-gradient(90deg, #3891A6 0%, #9BD1D6 40%, #3891A6 60%, #3891A6 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pw-shimmer 4s linear infinite;
        }
        .pw-cta-btn {
          position: relative;
          overflow: hidden;
        }
        .pw-cta-btn::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: rgba(255,255,255,0.12);
          transform: skewX(-20deg);
          transition: left 0.5s ease;
        }
        .pw-cta-btn:hover::after {
          left: 130%;
        }
        .pw-step-line::after {
          content: '';
          position: absolute;
          top: 28px;
          left: calc(50% + 56px);
          width: calc(100% - 112px);
          height: 1px;
          background: linear-gradient(90deg, rgba(56,145,166,0.5), rgba(56,145,166,0.1));
        }
        @media (max-width: 767px) {
          .pw-step-line::after { display: none; }
        }
      `}</style>

      <main style={{ backgroundColor: "#020202", minHeight: "100vh", overflowX: "hidden" }}>

        {/* ── Hero ──────────────────────────────────────────── */}
        <section style={{ position: "relative", padding: "120px 16px 100px", overflow: "hidden" }}>
          {/* Background orbs */}
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,145,166,0.18) 0%, transparent 70%)", animation: "pw-orb-1 18s ease-in-out infinite", filter: "blur(1px)" }} />
            <div style={{ position: "absolute", top: "30%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,145,166,0.1) 0%, transparent 70%)", animation: "pw-orb-2 22s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "5%", left: "45%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(253,231,76,0.07) 0%, transparent 70%)", animation: "pw-orb-3 15s ease-in-out infinite" }} />
            {/* Dot grid */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(56,145,166,0.4) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "pw-grid-fade 1.5s ease forwards" }} />
          </div>

          <div style={{ maxWidth: 1000, margin: "0 auto", position: "relative" }}>
            {/* Badge */}
            <div
              style={{
                display: "inline-block", marginBottom: 24,
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateY(0)" : "translateY(-16px)",
                transition: "opacity 0.6s ease, transform 0.6s ease",
              }}
            >
              <span
                className="pw-badge-pulse"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase",
                  padding: "6px 14px", borderRadius: 999,
                  color: "#FDE74C",
                  backgroundColor: "rgba(253,231,76,0.07)",
                  border: "1px solid rgba(253,231,76,0.28)",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#FDE74C", flexShrink: 0, boxShadow: "0 0 8px #FDE74C" }} />
                Live Puzzle Platform
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: "clamp(44px, 7vw, 80px)",
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: "-0.02em",
                color: "#fff",
                margin: "0 0 24px",
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s",
              }}
            >
              Crack Puzzles.<br />
              <span className="pw-shimmer-text">Dominate the Warz.</span>
            </h1>

            {/* Subtext */}
            <p
              style={{
                fontSize: 18, lineHeight: 1.7, color: "#9CA3AF", maxWidth: 560, margin: "0 0 40px",
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.7s ease 0.22s, transform 0.7s ease 0.22s",
              }}
            >
              ARG-style puzzle challenges for solo solvers and competitive teams.
              Earn points, race opponents in real-time, and climb the leaderboard.
            </p>

            {/* CTAs */}
            <div
              style={{
                display: "flex", gap: 12, flexWrap: "wrap",
                opacity: heroVisible ? 1 : 0,
                transform: heroVisible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.7s ease 0.34s, transform 0.7s ease 0.34s",
              }}
            >
              <Link
                href="/auth/register"
                className="pw-cta-btn"
                style={{
                  padding: "14px 32px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 14,
                  letterSpacing: "0.06em",
                  color: "#fff",
                  backgroundColor: "#3891A6",
                  boxShadow: "0 0 36px rgba(56,145,166,0.5)",
                  textDecoration: "none",
                  transition: "transform 0.2s, brightness 0.2s, box-shadow 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 52px rgba(56,145,166,0.7)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 36px rgba(56,145,166,0.5)"; }}
              >
                Start Solving Free →
              </Link>
              <Link
                href="/auth/signin"
                style={{
                  padding: "14px 32px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  color: "#9BD1D6",
                  backgroundColor: "transparent",
                  border: "1px solid rgba(56,145,166,0.4)",
                  textDecoration: "none",
                  transition: "border-color 0.2s, background-color 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(56,145,166,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,145,166,0.7)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,145,166,0.4)"; }}
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <StatsRow />
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={featuresReveal.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#3891A6", marginBottom: 12,
                  opacity: featuresReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease",
                }}
              >
                Feature Set
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14,
                  opacity: featuresReveal.visible ? 1 : 0,
                  transform: featuresReveal.visible ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s",
                }}
              >
                Why Puzzle Warz?
              </h2>
              <p
                style={{
                  color: "#6B7280", fontSize: 16, maxWidth: 480, margin: "0 auto",
                  opacity: featuresReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease 0.16s",
                }}
              >
                Solo challenge, team collaboration, or head-to-head combat — one platform, your rules.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {features.map((f, i) => (
                <FeatureCard key={i} {...f} delay={0.05 + i * 0.09} visible={featuresReveal.visible} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={stepsReveal.ref} style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#3891A6", marginBottom: 12,
                  opacity: stepsReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease",
                }}
              >
                Getting Started
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em",
                  opacity: stepsReveal.visible ? 1 : 0,
                  transform: stepsReveal.visible ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s",
                }}
              >
                In Three Moves
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
              {/* Connector lines */}
              {[0, 1].map(i => (
                <div
                  key={i}
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: 28,
                    left: `calc(${(i + 1) * 33.33}% - 16px)`,
                    width: "calc(33.33% - 16px)",
                    height: 1,
                    background: "linear-gradient(90deg, rgba(56,145,166,0.6), rgba(56,145,166,0.15))",
                    opacity: stepsReveal.visible ? 1 : 0,
                    transition: `opacity 0.8s ease ${0.4 + i * 0.2}s`,
                    pointerEvents: "none",
                  }}
                />
              ))}
              <StepCard num="01" title="Create Your Account" desc="Sign up free in seconds. No credit card, no catch." delay={0.1} visible={stepsReveal.visible} />
              <StepCard num="02" title="Pick a Puzzle" desc="Choose from 500+ challenges or let the daily pick surprise you." delay={0.25} visible={stepsReveal.visible} />
              <StepCard num="03" title="Compete & Rise" desc="Earn points, challenge rivals in Warz, and climb the global board." delay={0.4} visible={stepsReveal.visible} />
            </div>
          </div>
        </section>

        {/* ── Warz callout strip ─────────────────────────────── */}
        <section style={{ padding: "0 16px 100px" }}>
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
              borderRadius: 20,
              padding: "48px 48px",
              background: "linear-gradient(135deg, rgba(56,145,166,0.14) 0%, rgba(253,231,76,0.05) 100%)",
              border: "1px solid rgba(56,145,166,0.3)",
              display: "flex",
              flexWrap: "wrap",
              gap: 32,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ maxWidth: 520 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>⚔️</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#FDE74C" }}>Warz Mode</span>
              </div>
              <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 26, lineHeight: 1.3, marginBottom: 12 }}>
                Race a Rival. Win Their Points.
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: 15, lineHeight: 1.7 }}>
                Challenge any player to solve the same puzzle simultaneously. Wager a stake — the faster solver takes the pot.
                Pure skill. Pure stakes.
              </p>
            </div>
            <Link
              href="/auth/register"
              className="pw-cta-btn"
              style={{
                padding: "14px 32px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                letterSpacing: "0.06em",
                color: "#020202",
                backgroundColor: "#FDE74C",
                boxShadow: "0 0 32px rgba(253,231,76,0.35)",
                textDecoration: "none",
                whiteSpace: "nowrap",
                transition: "transform 0.2s, box-shadow 0.2s",
                display: "inline-block",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 48px rgba(253,231,76,0.55)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px rgba(253,231,76,0.35)"; }}
            >
              Enter the Warz →
            </Link>
          </div>
        </section>

        {/* ── Coming Soon ───────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={comingSoonReveal.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#FDE74C", marginBottom: 12,
                  opacity: comingSoonReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease",
                }}
              >
                On the Horizon
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14,
                  opacity: comingSoonReveal.visible ? 1 : 0,
                  transform: comingSoonReveal.visible ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s",
                }}
              >
                What&apos;s Coming Next
              </h2>
              <p
                style={{
                  color: "#6B7280", fontSize: 16, maxWidth: 520, margin: "0 auto",
                  opacity: comingSoonReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease 0.16s",
                }}
              >
                We&apos;re building immersive new puzzle experiences. Here&apos;s a sneak peek at what&apos;s dropping soon.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              <ComingSoonCard
                icon="🚪"
                title="Escape Rooms"
                desc="Multi-stage collaborative rooms with inventory systems, hidden clues, and timed challenges. Solve as a team or go solo."
                accent="#7C3AED"
                delay={0.05}
                visible={comingSoonReveal.visible}
              />
              <ComingSoonCard
                icon="🕵️"
                title="Detective Cases"
                desc="Noir-style mystery investigations with one-strike lockout. Gather evidence, follow leads, and make your accusation count."
                accent="#EF4444"
                delay={0.14}
                visible={comingSoonReveal.visible}
              />
              <ComingSoonCard
                icon="🌐"
                title="ARG Puzzles"
                desc="Alternate Reality Games that blur the line between game and reality. Decode ciphers, analyse images, and follow trails across the web."
                accent="#3891A6"
                delay={0.23}
                visible={comingSoonReveal.visible}
              />
            </div>
          </div>
        </section>

        {/* ── Testimonials ──────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={testimonialsReveal.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p
                style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase",
                  color: "#3891A6", marginBottom: 12,
                  opacity: testimonialsReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease",
                }}
              >
                Player Reviews
              </p>
              <h2
                style={{
                  fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14,
                  opacity: testimonialsReveal.visible ? 1 : 0,
                  transform: testimonialsReveal.visible ? "translateY(0)" : "translateY(20px)",
                  transition: "opacity 0.6s ease 0.08s, transform 0.6s ease 0.08s",
                }}
              >
                What Players Say
              </h2>
              <p
                style={{
                  color: "#6B7280", fontSize: 16,
                  opacity: testimonialsReveal.visible ? 1 : 0,
                  transition: "opacity 0.6s ease 0.16s",
                }}
              >
                Thousands of puzzle solvers can&apos;t be wrong
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} {...t} delay={0.05 + i * 0.09} visible={testimonialsReveal.visible} />
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section
          ref={ctaReveal.ref}
          style={{
            padding: "120px 16px",
            borderTop: "1px solid rgba(56,145,166,0.15)",
            borderBottom: "1px solid rgba(56,145,166,0.15)",
            background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,145,166,0.14) 0%, transparent 70%)",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <h2
              style={{
                fontSize: "clamp(32px, 5vw, 56px)",
                fontWeight: 800,
                color: "#fff",
                letterSpacing: "-0.02em",
                marginBottom: 18,
                lineHeight: 1.1,
                opacity: ctaReveal.visible ? 1 : 0,
                transform: ctaReveal.visible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 0.7s ease, transform 0.7s ease",
              }}
            >
              Your Puzzle Journey<br />
              <span className="pw-shimmer-text">Starts Now</span>
            </h2>
            <p
              style={{
                color: "#9CA3AF",
                fontSize: 17,
                lineHeight: 1.7,
                marginBottom: 40,
                opacity: ctaReveal.visible ? 1 : 0,
                transition: "opacity 0.7s ease 0.15s",
              }}
            >
              Free to play. No ads. Just puzzles, competition, and the thrill of cracking something no one else can.
            </p>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
                opacity: ctaReveal.visible ? 1 : 0,
                transform: ctaReveal.visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.7s ease 0.28s, transform 0.7s ease 0.28s",
              }}
            >
              <Link
                href="/auth/register"
                className="pw-cta-btn"
                style={{
                  padding: "16px 40px",
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  letterSpacing: "0.06em",
                  color: "#fff",
                  backgroundColor: "#3891A6",
                  boxShadow: "0 0 48px rgba(56,145,166,0.55)",
                  textDecoration: "none",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  display: "inline-block",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 64px rgba(56,145,166,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 48px rgba(56,145,166,0.55)"; }}
              >
                Create Free Account →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────── */}
        <footer style={{ padding: "64px 16px", borderTop: "1px solid rgba(56,145,166,0.12)" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginBottom: 40 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <img src="/images/puzzle_warz_logo.png" alt="Puzzle Warz Logo" style={{ height: 32, width: "auto" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6" }}>Puzzle Warz</span>
                </div>
                <p style={{ color: "#374151", fontSize: 12 }}>The ultimate multiplayer puzzle platform</p>
              </div>
              <div style={{ display: "flex", gap: 48, fontSize: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6" }}>Play</p>
                  {["Puzzles", "Daily Challenge", "Teams"].map(l => (
                    <Link key={l} href="/auth/register" style={{ color: "#4B5563", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#4B5563")}
                    >{l}</Link>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6" }}>Compete</p>
                  {["Leaderboards", "Achievements", "Learn"].map(l => (
                    <Link key={l} href="/auth/register" style={{ color: "#4B5563", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#4B5563")}
                    >{l}</Link>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, paddingTop: 24, borderTop: "1px solid rgba(56,145,166,0.08)" }}>
              <p style={{ color: "#1F2937", fontSize: 12 }}>&copy; 2026 Puzzle Warz &middot; All rights reserved</p>
              <p style={{ color: "#1F2937", fontSize: 12 }}>Collaborative Puzzle Platform</p>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
