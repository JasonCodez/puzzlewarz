"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

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

/* ── Feature card ─────────────────────────────────────────── */
interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  accent: "teal" | "gold";
  delay?: number;
  visible?: boolean;
  comingSoon?: boolean;
  comingSoonLabel?: string;
}
function FeatureCard({ icon, title, desc, accent, delay = 0, visible = false, comingSoon = false, comingSoonLabel }: FeatureCardProps) {
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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{title}</h3>
        {comingSoon && (
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 999, color: "#a78bfa", backgroundColor: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.3)", whiteSpace: "nowrap" }}>{comingSoonLabel || "Coming Soon"}</span>
        )}
      </div>
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
  initials: string;
  accent: "teal" | "gold";
  delay: number;
  visible: boolean;
}
function TestimonialCard({ quote, name, initials, accent, delay, visible }: TestimonialProps) {
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
  const [todayQuestion, setTodayQuestion] = useState<string | null>(null);
  const instantReveal   = useReveal();
  const stepsReveal     = useReveal();
  const escapeReveal    = useReveal();
  const competReveal    = useReveal();
  const dailyReveal     = useReveal();
  const comingSoonReveal = useReveal();
  const testimonialsReveal = useReveal();
  const finalReveal     = useReveal();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    fetch("/api/frequency/today")
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.question?.question) setTodayQuestion(data.question.question); })
      .catch(() => {});
  }, []);

  const features = [
    { icon: "🧩", title: "Progressive Puzzles", desc: "Unlock challenges in stages with smart dependencies. Each solved clue opens a new layer of the mystery.", accent: "teal" as const },
    { icon: "🎯", title: "Solo or Team", desc: "Play solo at your own pace or team up with friends for collaborative puzzle solving.", accent: "gold" as const, comingSoon: true, comingSoonLabel: "Team Puzzles Coming Soon" },
    { icon: "🏆", title: "Live Leaderboards", desc: "Track your global position in real-time and compete against hundreds of other solvers.", accent: "teal" as const },
    { icon: "⚔️", title: "Warz Battles", desc: "Challenge opponents head-to-head. Wager points on who can crack the same puzzle faster.", accent: "gold" as const },
    { icon: "⚡", title: "Strategic Hints", desc: "Use hints wisely — each one trims your score multiplier. Big brain plays beat the grind.", accent: "teal" as const },
    { icon: "🎖️", title: "Achievements", desc: "Unlock badges, milestones, and streak rewards as you conquer the puzzle universe.", accent: "gold" as const },
  ];

  const testimonials = [
    { quote: "The Warz battles had me up until 3am. My heart was pounding the entire time. Nothing comes close to PuzzleWarz.", name: "Jake R.", initials: "JR", accent: "teal" as const },
    { quote: "I got my whole office hooked. We compete on the daily puzzle every morning and trash talk all afternoon. It's perfect.", name: "Sarah M.", initials: "SM", accent: "gold" as const },
    { quote: "The daily challenge is the first thing I open every morning. 47-day streak and counting. The variety keeps it completely fresh.", name: "Alex T.", initials: "AT", accent: "teal" as const },
    { quote: "Wagering points on a Warz is a different kind of rush. Lost my first three then went on a 9-win streak.", name: "Dana K.", initials: "DK", accent: "gold" as const },
    { quote: "These aren't your typical word searches. They make you think sideways. I've genuinely changed how I analyze information.", name: "Marcus P.", initials: "MP", accent: "teal" as const },
    { quote: "Free to play, genuinely hard, and the forum community is helpful without spoilers. Already got three friends hooked.", name: "Riley L.", initials: "RL", accent: "gold" as const },
  ];

  const fade = (visible: boolean, delay = 0, y = 24) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? "translateY(0)" : `translateY(${y}px)`,
    transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
  });

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
        @keyframes pw-badge-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(253,231,76,0.35); }
          50%       { box-shadow: 0 0 0 8px rgba(253,231,76,0); }
        }
        @keyframes pw-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pw-grid-fade {
          from { opacity: 0; }
          to   { opacity: 0.035; }
        }
        .pw-badge-pulse { animation: pw-badge-pulse 2.5s ease-in-out infinite; }
        .pw-shimmer-text {
          background: linear-gradient(90deg, #3891A6 0%, #9BD1D6 40%, #3891A6 60%, #3891A6 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pw-shimmer 4s linear infinite;
        }
        .pw-cta-btn { position: relative; overflow: hidden; }
        .pw-cta-btn::after {
          content: '';
          position: absolute;
          top: -50%; left: -60%; width: 40%; height: 200%;
          background: rgba(255,255,255,0.12);
          transform: skewX(-20deg);
          transition: left 0.5s ease;
        }
        .pw-cta-btn:hover::after { left: 130%; }
        @media (max-width: 640px) {
          .pw-steps-grid { grid-template-columns: 1fr !important; gap: 1.5rem !important; }
          .pw-steps-connector { display: none !important; }
          .pw-escape-box { padding: 32px 18px !important; }
          .pw-daily-box { padding: 32px 18px !important; flex-direction: column !important; }
          .pw-instant-box { padding: 24px 16px !important; }
          .pw-footer-links { gap: 24px !important; flex-wrap: wrap !important; }
        }
      `}</style>

      <main style={{ backgroundColor: "#020202", minHeight: "100vh", overflowX: "hidden" }}>

        {/* ── HERO ──────────────────────────────────────────── */}
        <section style={{ position: "relative", padding: "130px 16px 110px", overflow: "hidden", textAlign: "center" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div style={{ position: "absolute", top: "10%", left: "15%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,145,166,0.18) 0%, transparent 70%)", animation: "pw-orb-1 18s ease-in-out infinite", filter: "blur(1px)" }} />
            <div style={{ position: "absolute", top: "30%", right: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,145,166,0.1) 0%, transparent 70%)", animation: "pw-orb-2 22s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "5%", left: "45%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(253,231,76,0.07) 0%, transparent 70%)", animation: "pw-orb-3 15s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(56,145,166,0.4) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "pw-grid-fade 1.5s ease forwards" }} />
          </div>

          <div style={{ maxWidth: 740, margin: "0 auto", position: "relative" }}>
            <div style={{ display: "inline-block", marginBottom: 24, ...fade(heroVisible, 0, -16) }}>
              <span className="pw-badge-pulse" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 999, color: "#FDE74C", backgroundColor: "rgba(253,231,76,0.07)", border: "1px solid rgba(253,231,76,0.28)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#FDE74C", flexShrink: 0, boxShadow: "0 0 8px #FDE74C" }} />
                Live Now — Daily Puzzle Open
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(48px, 8vw, 88px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: "#fff", margin: "0 0 20px", ...fade(heroVisible, 0.1) }}>
              Can You Pass<br /><span className="pw-shimmer-text">The Test?</span>
            </h1>

            <p style={{ fontSize: 20, lineHeight: 1.65, color: "#9CA3AF", maxWidth: 520, margin: "0 auto 12px", ...fade(heroVisible, 0.22) }}>
              Most players fail.
            </p>
            <p style={{ fontSize: 16, lineHeight: 1.7, color: "#6B7280", maxWidth: 480, margin: "0 auto 44px", ...fade(heroVisible, 0.28) }}>
              Solve puzzles, climb the ranks, and unlock what&apos;s coming next.
              Escape rooms unlock soon — for those who qualify.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", ...fade(heroVisible, 0.38) }}>
              <Link href="/frequency" className="pw-cta-btn" style={{ padding: "16px 36px", borderRadius: 10, fontWeight: 800, fontSize: 15, letterSpacing: "0.04em", color: "#fff", backgroundColor: "#3891A6", boxShadow: "0 0 40px rgba(56,145,166,0.55)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 56px rgba(56,145,166,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(56,145,166,0.55)"; }}
              >
                ▶ Play Now — No Account Needed
              </Link>
              <Link href="/auth/register" style={{ padding: "16px 32px", borderRadius: 10, fontWeight: 600, fontSize: 15, color: "#9BD1D6", backgroundColor: "transparent", border: "1px solid rgba(56,145,166,0.4)", textDecoration: "none", display: "inline-block", transition: "border-color 0.2s, background-color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(56,145,166,0.1)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,145,166,0.7)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,145,166,0.4)"; }}
              >
                🔒 Unlock Full Access
              </Link>
            </div>
          </div>
        </section>

        {/* ── INSTANT PLAY ──────────────────────────────────── */}
        <section style={{ padding: "80px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={instantReveal.ref} style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3891A6", marginBottom: 12, ...fade(instantReveal.visible, 0) }}>Your First Test</p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 16, ...fade(instantReveal.visible, 0.08) }}>
              Think Like the Crowd
            </h2>
            <p style={{ color: "#6B7280", fontSize: 16, marginBottom: 36, ...fade(instantReveal.visible, 0.16) }}>
              Solve this to begin your progression.
            </p>

            <div className="pw-instant-box" style={{ borderRadius: 20, border: "1px solid rgba(56,145,166,0.3)", background: "rgba(56,145,166,0.06)", padding: "36px 32px", ...fade(instantReveal.visible, 0.22) }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>📡</div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6", marginBottom: 14 }}>Today&apos;s Question</p>
              {todayQuestion ? (
                <p style={{ fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1.4, marginBottom: 28 }}>&ldquo;{todayQuestion}&rdquo;</p>
              ) : (
                <p style={{ fontSize: 18, color: "#6B7280", lineHeight: 1.5, marginBottom: 28 }}>A new question drops every day.<br />Can you match the crowd?</p>
              )}
              <Link href="/frequency" className="pw-cta-btn" style={{ padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#fff", backgroundColor: "#3891A6", boxShadow: "0 0 28px rgba(56,145,166,0.4)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
              >
                Submit Your Answer →
              </Link>
              <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 24, flexWrap: "wrap" }}>
                {["✔ No signup required", "✔ Instant feedback", "✔ Your results matter"].map(t => (
                  <span key={t} style={{ fontSize: 12, color: "#4B9AAA", fontWeight: 500 }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ──────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={stepsReveal.ref} style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3891A6", marginBottom: 12, ...fade(stepsReveal.visible, 0) }}>How It Works</p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", ...fade(stepsReveal.visible, 0.08) }}>Three Steps to Prove Yourself</h2>
            </div>
            <div className="pw-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32, position: "relative" }}>
              {[0, 1].map(i => (
                <div key={i} aria-hidden className="pw-steps-connector" style={{ position: "absolute", top: 28, left: `calc(${(2 * i + 1) * 16.666}% + 44px)`, width: `calc(33.33% - 56px)`, height: 1, background: "linear-gradient(90deg, rgba(56,145,166,0.6), rgba(56,145,166,0.15))", opacity: stepsReveal.visible ? 1 : 0, transition: `opacity 0.8s ease ${0.4 + i * 0.2}s`, pointerEvents: "none" }} />
              ))}
              <StepCard num="01" title="Solve Puzzles" desc="Start with quick challenges and sharpen your thinking. No account needed." delay={0.1} visible={stepsReveal.visible} />
              <StepCard num="02" title="Climb the Rankings" desc="Earn your place on the leaderboard. Every point counts toward your rank." delay={0.25} visible={stepsReveal.visible} />
              <StepCard num="03" title="Unlock Access" desc="Only top solvers gain entry to upcoming escape rooms. Prove you're ready." delay={0.4} visible={stepsReveal.visible} />
            </div>
          </div>
        </section>

        {/* ── ESCAPE ROOM TEASE ─────────────────────────────── */}
        <section style={{ padding: "0 16px 100px" }}>
          <div ref={escapeReveal.ref} className="pw-escape-box" style={{ maxWidth: 1100, margin: "0 auto", borderRadius: 24, padding: "64px 48px", background: "linear-gradient(135deg, rgba(124,58,237,0.14) 0%, rgba(56,145,166,0.06) 100%)", border: "1px solid rgba(124,58,237,0.3)", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.3) 1px, transparent 1px)", backgroundSize: "32px 32px", opacity: 0.04, pointerEvents: "none" }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#a78bfa", marginBottom: 16, ...fade(escapeReveal.visible, 0) }}>Coming Soon</p>
              <h2 style={{ fontSize: "clamp(30px, 5vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 20, lineHeight: 1.1, ...fade(escapeReveal.visible, 0.1) }}>
                Escape Rooms Are Coming
              </h2>
              <p style={{ color: "#9CA3AF", fontSize: 17, lineHeight: 1.8, maxWidth: 560, margin: "0 auto 12px", ...fade(escapeReveal.visible, 0.2) }}>
                This isn&apos;t just a puzzle site.
              </p>
              <p style={{ color: "#9CA3AF", fontSize: 17, lineHeight: 1.8, maxWidth: 560, margin: "0 auto 36px", ...fade(escapeReveal.visible, 0.26) }}>
                It&apos;s a system. Those who prove themselves will gain access to immersive escape rooms — where every decision matters and only the best get in.
              </p>
              <div style={fade(escapeReveal.visible, 0.34)}>
                <Link href="/auth/register" className="pw-cta-btn" style={{ padding: "14px 36px", borderRadius: 10, fontWeight: 700, fontSize: 15, color: "#fff", backgroundColor: "#7C3AED", boxShadow: "0 0 36px rgba(124,58,237,0.45)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 52px rgba(124,58,237,0.65)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 36px rgba(124,58,237,0.45)"; }}
                >
                  Join Early Access
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── COMPETITIVE HOOK ──────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={competReveal.ref} style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 48, justifyContent: "space-between" }}>
            <div style={{ flex: "1 1 320px", ...fade(competReveal.visible, 0) }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FDE74C", marginBottom: 16 }}>Compete</p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 20, lineHeight: 1.2 }}>
                Can You Beat<br />Everyone Else?
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                {["Compete against players worldwide", "Track your rank in real-time", "Challenge rivals head-to-head in Warz", "Prove your skill — no luck involved"].map(item => (
                  <div key={item} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ color: "#3891A6", fontWeight: 700, fontSize: 16 }}>→</span>
                    <span style={{ color: "#9CA3AF", fontSize: 15 }}>{item}</span>
                  </div>
                ))}
              </div>
              <Link href="/auth/register" className="pw-cta-btn" style={{ padding: "13px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#020202", backgroundColor: "#FDE74C", boxShadow: "0 0 24px rgba(253,231,76,0.3)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(253,231,76,0.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 24px rgba(253,231,76,0.3)"; }}
              >
                View Leaderboard →
              </Link>
            </div>
            <div style={{ flex: "1 1 280px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, ...fade(competReveal.visible, 0.18) }}>
              {[
                { label: "Puzzles Solved", value: "12,400+", color: "#3891A6" },
                { label: "Active Players", value: "3,200+", color: "#FDE74C" },
                { label: "Daily Challenges", value: "365/yr", color: "#a78bfa" },
                { label: "Escape Rooms", value: "Coming", color: "#EF4444" },
              ].map(stat => (
                <div key={stat.label} style={{ borderRadius: 16, border: `1px solid ${stat.color}28`, backgroundColor: `${stat.color}08`, padding: "24px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 26, fontWeight: 800, color: stat.color, marginBottom: 6 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, color: "#6B7280", fontWeight: 500 }}>{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── DAILY HOOK ────────────────────────────────────── */}
        <section style={{ padding: "0 16px 100px" }}>
          <div ref={dailyReveal.ref} className="pw-daily-box" style={{ maxWidth: 1100, margin: "0 auto", borderRadius: 20, padding: "48px 48px", background: "linear-gradient(135deg, rgba(56,145,166,0.14) 0%, rgba(253,231,76,0.05) 100%)", border: "1px solid rgba(56,145,166,0.3)", display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ maxWidth: 500, ...fade(dailyReveal.visible, 0) }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 28 }}>📅</span>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6" }}>Daily Challenge</span>
              </div>
              <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 28, lineHeight: 1.25, marginBottom: 12 }}>
                A New Test Every Day.
              </h3>
              <p style={{ color: "#9CA3AF", fontSize: 16, lineHeight: 1.7 }}>
                Miss it — and you fall behind. A fresh puzzle drops every 24 hours. Streaks are built daily.
              </p>
            </div>
            <div style={fade(dailyReveal.visible, 0.18)}>
              <Link href="/frequency" className="pw-cta-btn" style={{ padding: "14px 32px", borderRadius: 10, fontWeight: 700, fontSize: 14, letterSpacing: "0.06em", color: "#fff", backgroundColor: "#3891A6", boxShadow: "0 0 32px rgba(56,145,166,0.4)", textDecoration: "none", whiteSpace: "nowrap", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 48px rgba(56,145,166,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 32px rgba(56,145,166,0.4)"; }}
              >
                Play Today&apos;s Puzzle →
              </Link>
            </div>
          </div>
        </section>

        {/* ── FEATURES ──────────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={comingSoonReveal.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3891A6", marginBottom: 12, ...fade(comingSoonReveal.visible, 0) }}>Everything You Need</p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14, ...fade(comingSoonReveal.visible, 0.08) }}>Built for Serious Solvers</h2>
              <p style={{ color: "#6B7280", fontSize: 16, maxWidth: 480, margin: "0 auto", ...fade(comingSoonReveal.visible, 0.16) }}>Solo challenge, team play, or head-to-head battles — one platform, your rules.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {features.map((f, i) => (
                <FeatureCard key={i} {...f} delay={0.05 + i * 0.09} visible={comingSoonReveal.visible} />
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────── */}
        <section style={{ padding: "100px 16px", borderTop: "1px solid rgba(56,145,166,0.1)" }}>
          <div ref={testimonialsReveal.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 64 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#3891A6", marginBottom: 12, ...fade(testimonialsReveal.visible, 0) }}>Player Reviews</p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14, ...fade(testimonialsReveal.visible, 0.08) }}>What Players Say</h2>
              <p style={{ color: "#6B7280", fontSize: 16, ...fade(testimonialsReveal.visible, 0.16) }}>Thousands of puzzle solvers can&apos;t be wrong</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
              {testimonials.map((t, i) => (
                <TestimonialCard key={i} {...t} delay={0.05 + i * 0.09} visible={testimonialsReveal.visible} />
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL PUSH ────────────────────────────────────── */}
        <section ref={finalReveal.ref} style={{ padding: "140px 16px", borderTop: "1px solid rgba(56,145,166,0.15)", borderBottom: "1px solid rgba(56,145,166,0.15)", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,145,166,0.12) 0%, transparent 70%)", textAlign: "center" }}>
          <div style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 24, lineHeight: 1.1, ...fade(finalReveal.visible, 0) }}>
              Most People<br /><span style={{ color: "#6B7280" }}>Quit Early.</span>
            </h2>
            <p style={{ color: "#4B5563", fontSize: 18, lineHeight: 1.9, marginBottom: 8, ...fade(finalReveal.visible, 0.12) }}>They get stuck.</p>
            <p style={{ color: "#4B5563", fontSize: 18, lineHeight: 1.9, marginBottom: 8, ...fade(finalReveal.visible, 0.18) }}>They lose focus.</p>
            <p style={{ color: "#4B5563", fontSize: 18, lineHeight: 1.9, marginBottom: 48, ...fade(finalReveal.visible, 0.24) }}>They give up.</p>
            <h3 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "#fff", marginBottom: 36, ...fade(finalReveal.visible, 0.32) }}>Do You?</h3>
            <div style={{ display: "flex", justifyContent: "center", ...fade(finalReveal.visible, 0.4) }}>
              <Link href="/frequency" className="pw-cta-btn" style={{ padding: "18px 48px", borderRadius: 10, fontWeight: 800, fontSize: 16, letterSpacing: "0.06em", color: "#fff", backgroundColor: "#3891A6", boxShadow: "0 0 56px rgba(56,145,166,0.6)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.03)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 72px rgba(56,145,166,0.8)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 56px rgba(56,145,166,0.6)"; }}
              >
                Start Now →
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ────────────────────────────────────────── */}
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
              <div className="pw-footer-links" style={{ display: "flex", gap: 48, fontSize: 14 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6" }}>Play</p>
                  {[["Daily Puzzle", "/frequency"], ["All Puzzles", "/auth/register"], ["Leaderboard", "/auth/register"]].map(([l, h]) => (
                    <Link key={l} href={h} style={{ color: "#4B5563", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#4B5563")}
                    >{l}</Link>
                  ))}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#3891A6" }}>Account</p>
                  {[["Sign Up Free", "/auth/register"], ["Sign In", "/auth/signin"], ["Achievements", "/auth/register"]].map(([l, h]) => (
                    <Link key={l} href={h} style={{ color: "#4B5563", textDecoration: "none", transition: "color 0.2s" }}
                      onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                      onMouseLeave={e => (e.currentTarget.style.color = "#4B5563")}
                    >{l}</Link>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, paddingTop: 24, borderTop: "1px solid rgba(56,145,166,0.08)" }}>
              <p style={{ color: "#1F2937", fontSize: 12 }}>&copy; 2026 Puzzle Warz &middot; All rights reserved</p>
              <p style={{ color: "#1F2937", fontSize: 12 }}>Train your mind. Earn your rank.</p>
            </div>
          </div>
        </footer>

      </main>
    </>
  );
}
