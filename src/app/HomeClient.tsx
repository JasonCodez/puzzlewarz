"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import HomepageWordScryCard from "@/components/home/HomepageWordScryCard";

function useReveal(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function useCountdown() {
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const next = new Date();
      next.setUTCHours(24, 0, 0, 0);
      setSecs(Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000)));
    };

    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);

  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

const fade = (visible: boolean, delay = 0, y = 28): CSSProperties => ({
  opacity: visible ? 1 : 0,
  transform: visible ? "translateY(0)" : `translateY(${y}px)`,
  transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
});

export default function HomeClient() {
  const [heroVisible, setHeroVisible] = useState(false);
  const countdown = useCountdown();
  const { data: session } = useSession();
  const competeHref = session ? "/warz" : "/auth/register";

  const routineReveal = useReveal();
  const libraryReveal = useReveal();
  const shareReveal = useReveal();
  const finalReveal = useReveal();

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 60);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pw-orb-float {
          0%,100% { transform: translate(0,0) scale(1); }
          33% { transform: translate(60px,-36px) scale(1.05); }
          66% { transform: translate(-24px,42px) scale(0.96); }
        }
        @keyframes pw-orb-float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40% { transform: translate(-52px,28px) scale(1.03); }
          70% { transform: translate(34px,-48px) scale(0.98); }
        }
        @keyframes pw-grid-in {
          from { opacity: 0; }
          to { opacity: 0.06; }
        }
        @keyframes pw-pulse-dot {
          0%,100% { box-shadow: 0 0 0 0 rgba(56,211,153,0.5); }
          50% { box-shadow: 0 0 0 7px rgba(56,211,153,0); }
        }
        @keyframes pw-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .pw-shimmer-text {
          background: linear-gradient(90deg, #38D399 0%, #F4FFE8 34%, #FDE74C 68%, #38D399 100%);
          background-size: 220% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pw-shimmer 4.2s linear infinite;
        }
        .pw-cta { position: relative; overflow: hidden; }
        .pw-cta::after {
          content: "";
          position: absolute;
          top: -50%;
          left: -60%;
          width: 38%;
          height: 200%;
          background: rgba(255,255,255,0.12);
          transform: skewX(-18deg);
          transition: left 0.5s ease;
        }
        .pw-cta:hover::after { left: 130%; }
        .pw-feature { transition: transform 0.25s, border-color 0.22s, box-shadow 0.22s; }
        .pw-feature:hover { transform: translateY(-6px); }
        @media (max-width: 900px) {
          .hw-hero-grid {
            grid-template-columns: 1fr !important;
            gap: 28px !important;
          }
          .hw-hero-copy {
            order: 2 !important;
          }
          .hw-preview-card {
            order: 1 !important;
          }
        }
        @media (max-width: 700px) {
          .hero-btns { flex-direction: column !important; align-items: stretch !important; }
          .hero-stats { flex-direction: column !important; align-items: stretch !important; }
        }
        @media (max-width: 640px) {
          .hw-hero { padding: 78px 16px 56px !important; }
          .hw-orb-1 { width: 260px !important; height: 260px !important; top: 4% !important; left: -4% !important; }
          .hw-orb-2 { display: none !important; }
          .hw-section { padding: 56px 16px !important; }
          .hw-preview-card { padding: 18px !important; }
          .hw-preview-grid { gap: 8px !important; }
          .hw-preview-tile { min-height: 46px !important; font-size: 18px !important; }
          .hw-steps-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .hw-library-grid { grid-template-columns: 1fr !important; }
          .hw-share-wrap { flex-direction: column !important; gap: 20px !important; align-items: stretch !important; }
          .hw-share-pre { font-size: 12px !important; padding: 16px 14px !important; overflow-x: auto !important; max-width: 100% !important; }
          .hw-final-section { padding: 86px 16px !important; }
          .hw-footer-inner { flex-direction: column !important; gap: 28px !important; align-items: center !important; text-align: center !important; }
          .hw-footer-nav { flex-direction: column !important; gap: 28px !important; align-items: center !important; text-align: center !important; }
          .hw-footer-bottom { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 4px !important; }
          .hw-badge { font-size: 9px !important; padding: 4px 10px !important; }
        }
      `}</style>

      <main style={{ backgroundColor: "#010101", minHeight: "100vh", overflowX: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <section className="hw-hero" style={{ position: "relative", padding: "118px 20px 84px", overflow: "hidden" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div className="hw-orb-1" style={{ position: "absolute", top: "8%", left: "10%", width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,211,153,0.15) 0%, transparent 68%)", animation: "pw-orb-float 22s ease-in-out infinite", filter: "blur(2px)" }} />
            <div className="hw-orb-2" style={{ position: "absolute", top: "18%", right: "8%", width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(253,231,76,0.12) 0%, transparent 68%)", animation: "pw-orb-float2 25s ease-in-out infinite" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle, rgba(56,211,153,0.5) 1px, transparent 1px)", backgroundSize: "36px 36px", animation: "pw-grid-in 1.8s ease forwards" }} />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 88% 72% at 50% 50%, transparent 24%, #010101 100%)" }} />
          </div>

          <div className="hw-hero-grid" style={{ maxWidth: 1160, margin: "0 auto", display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(340px,0.9fr)", gap: 40, alignItems: "center", position: "relative" }}>
            <div className="hw-hero-copy">
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 999, background: "rgba(56,211,153,0.08)", border: "1px solid rgba(56,211,153,0.24)", marginBottom: 28, ...fade(heroVisible, 0) }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#38D399", animation: "pw-pulse-dot 1.5s ease-in-out infinite" }} />
                <span className="hw-badge" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#38D399" }}>
                  Daily Hidden Word is live
                </span>
              </div>

              <h1 style={{ fontSize: "clamp(50px,9vw,94px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 8px", ...fade(heroVisible, 0.08) }}>Daily</h1>
              <h1 style={{ fontSize: "clamp(50px,9vw,94px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", margin: "0 0 8px", ...fade(heroVisible, 0.12) }}>
                <span className="pw-shimmer-text">Hidden Word</span>
              </h1>
              <h1 style={{ fontSize: "clamp(50px,9vw,94px)", fontWeight: 900, lineHeight: 1.0, letterSpacing: "-0.04em", color: "#fff", margin: "0 0 28px", ...fade(heroVisible, 0.16) }}>Starts Here.</h1>

              <p style={{ fontSize: 19, color: "#D1D5DB", maxWidth: 600, margin: "0 0 12px", lineHeight: 1.7, ...fade(heroVisible, 0.24) }}>
                Six guesses. One fresh word every UTC midnight. Solve today&apos;s word right here, then roll straight into Gridlock files, crosswords, word searches, and the rest of the catalog.
              </p>
              <p style={{ fontSize: 15, color: "#6B7280", maxWidth: 560, margin: "0 0 40px", lineHeight: 1.7, ...fade(heroVisible, 0.3) }}>
                Start on the homepage, keep the streak alive, and jump into deeper puzzle runs whenever you want a longer session.
              </p>

              <div className="hero-btns" style={{ display: "flex", gap: 12, flexWrap: "wrap", ...fade(heroVisible, 0.38) }}>
                <Link href="/daily" className="pw-cta" style={{ padding: "16px 34px", borderRadius: 10, fontWeight: 900, fontSize: 15, letterSpacing: "0.04em", color: "#020202", background: "linear-gradient(135deg, #38D399 0%, #FDE74C 100%)", boxShadow: "0 0 42px rgba(56,211,153,0.26)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(56,211,153,0.34)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 42px rgba(56,211,153,0.26)"; }}
                >⚡ Open Full Daily Page</Link>
                <Link href="/puzzles" style={{ padding: "16px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, color: "#E5E7EB", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", display: "inline-block", transition: "border-color 0.2s, background 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.28)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
                >Browse Puzzle Library</Link>
                <Link href={competeHref} style={{ padding: "16px 28px", borderRadius: 10, fontWeight: 700, fontSize: 15, color: "#9BD6E4", background: "transparent", border: "1px solid rgba(56,145,166,0.35)", textDecoration: "none", display: "inline-block", transition: "border-color 0.2s, background 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(56,145,166,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,145,166,0.68)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,145,166,0.35)"; }}
                >⚔ Warz Battles</Link>
              </div>

              <div className="hero-stats" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 32, ...fade(heroVisible, 0.46) }}>
                {[
                  { label: "6 guesses", tone: "#38D399" },
                  { label: `Resets in ${countdown} UTC`, tone: "#FDE74C" },
                  { label: "No account required", tone: "#9BD6E4" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#D1D5DB", fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.tone, boxShadow: `0 0 18px ${item.tone}` }} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="hw-preview-card" style={{ borderRadius: 24, border: "1px solid rgba(255,255,255,0.09)", background: "linear-gradient(160deg, rgba(3,18,13,0.92) 0%, rgba(4,7,17,0.96) 100%)", padding: 24, boxShadow: "0 26px 80px rgba(0,0,0,0.45)", ...fade(heroVisible, 0.28, 18) }}>
              <HomepageWordScryCard />
            </div>
          </div>
        </section>

        <section className="hw-section" style={{ padding: "84px 20px", borderTop: "1px solid rgba(56,211,153,0.08)" }}>
          <div ref={routineReveal.ref} style={{ maxWidth: 980, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12, ...fade(routineReveal.visible, 0) }}>The daily rhythm</p>
            <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.08, marginBottom: 14, ...fade(routineReveal.visible, 0.08) }}>
              Quick to open. Hard to quit.
            </h2>
            <p style={{ color: "#6B7280", fontSize: 16, maxWidth: 540, margin: "0 auto 52px", lineHeight: 1.75, ...fade(routineReveal.visible, 0.16) }}>
              A quick daily solve gets you moving fast, and the full library is there when you want to stay and keep solving puzzles.
            </p>
            <div className="hw-steps-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20, ...fade(routineReveal.visible, 0.24) }}>
              {[
                { n: "01", icon: "⚡", title: "Open the daily", body: "Jump straight into a single five-letter target. No setup. No warmup. Just the puzzle." },
                { n: "02", icon: "🟩", title: "Read the feedback", body: "Green locks position, yellow keeps the letter alive, dark tiles kill bad branches fast." },
                { n: "03", icon: "🧩", title: "Keep the session going", body: "Once the word is solved, push deeper into Gridlock files and the wider puzzle catalog." },
              ].map((step) => (
                <div
                  key={step.n}
                  style={{ padding: "28px 22px", borderRadius: 18, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(56,211,153,0.28)"; (e.currentTarget as HTMLElement).style.background = "rgba(56,211,153,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}
                >
                  <div style={{ fontSize: 28, marginBottom: 16 }}>{step.icon}</div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#38D399", marginBottom: 10 }}>{step.n}</p>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{step.title}</h3>
                  <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.7 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hw-section" style={{ padding: "84px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div ref={libraryReveal.ref} style={{ maxWidth: 1100, margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: 46 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 12, ...fade(libraryReveal.visible, 0) }}>What sits behind it</p>
              <h2 style={{ fontSize: "clamp(26px,4vw,42px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", marginBottom: 14, ...fade(libraryReveal.visible, 0.08) }}>
                Hidden Word leads. The full library follows.
              </h2>
              <p style={{ color: "#6B7280", fontSize: 16, maxWidth: 640, margin: "0 auto", lineHeight: 1.75, ...fade(libraryReveal.visible, 0.16) }}>
                After the daily opener, you can browse Gridlock files, crosswords, word searches, and the rest of the library in one place.
              </p>
            </div>

            <div className="hw-library-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
              {[
                {
                  icon: "⚡",
                  title: "Daily Hidden Word",
                  tag: "Front Door",
                  tagColor: "#38D399",
                  body: "One tight word puzzle each day, tuned to be the quickest and cleanest way into the site.",
                  href: "/daily",
                  cta: "Play the Daily",
                },
                {
                  icon: "🔐",
                  title: "Gridlock Files",
                  tag: "Catalog Ready",
                  tagColor: "#FDE74C",
                  body: "Standalone Gridlock files now belong in the normal puzzle library, so players can browse and replay them anytime.",
                  href: "/puzzles",
                  cta: "Browse Gridlock and More",
                },
                {
                  icon: "✏",
                  title: "Puzzle Library",
                  tag: "Always On",
                  tagColor: "#9BD6E4",
                  body: "Crosswords, word searches, anagrams, detective cases, and long-session puzzle runs live in one place.",
                  href: "/puzzles",
                  cta: "Open the Library",
                },
                {
                  icon: "⚔",
                  title: "Warz Battles",
                  tag: session ? "Live" : "Account",
                  tagColor: "#F97316",
                  body: "Take the same puzzle head-to-head, chase the better solve, and turn single-player momentum into ranked pressure.",
                  href: competeHref,
                  cta: session ? "Enter Warz" : "Create Your Account",
                },
              ].map((feature, index) => (
                <div
                  key={feature.title}
                  className="pw-feature"
                  style={{
                    padding: "26px 22px",
                    borderRadius: 18,
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    opacity: libraryReveal.visible ? 1 : 0,
                    transform: libraryReveal.visible ? "translateY(0)" : "translateY(28px)",
                    transition: `opacity 0.6s ease ${0.04 + index * 0.08}s, transform 0.6s ease ${0.04 + index * 0.08}s, border-color 0.22s, box-shadow 0.22s`,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${feature.tagColor}40`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 38px ${feature.tagColor}16`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22 }}>{feature.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 999, color: feature.tagColor, background: `${feature.tagColor}14`, border: `1px solid ${feature.tagColor}30` }}>
                      {feature.tag}
                    </span>
                  </div>
                  <h3 style={{ color: "#fff", fontWeight: 800, fontSize: 18, margin: 0 }}>{feature.title}</h3>
                  <p style={{ color: "#9CA3AF", fontSize: 14, lineHeight: 1.7, flexGrow: 1, margin: 0 }}>{feature.body}</p>
                  <Link href={feature.href} style={{ fontSize: 13, fontWeight: 800, color: feature.tagColor, textDecoration: "none", borderBottom: `1px solid ${feature.tagColor}30`, paddingBottom: 2, alignSelf: "flex-start" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = feature.tagColor)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = `${feature.tagColor}30`)}
                  >{feature.cta} →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="hw-section" style={{ padding: "84px 20px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div ref={shareReveal.ref} style={{ maxWidth: 840, margin: "0 auto" }}>
            <div className="hw-share-wrap" style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", justifyContent: "center" }}>
              <div style={{ flexShrink: 0, minWidth: 0, maxWidth: 360, ...fade(shareReveal.visible, 0) }}>
                <div style={{ display: "grid", gap: 12, padding: "24px 24px", borderRadius: 18, background: "rgba(56,211,153,0.04)", border: "1px solid rgba(56,211,153,0.22)" }}>
                  {[
                    "Solve the live daily word on the homepage.",
                    "Guest wins bank XP, points, and streak progress.",
                    "Create an account whenever you want to collect and keep them.",
                  ].map((line, index) => (
                    <div key={line} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 24, height: 24, flexShrink: 0, borderRadius: 999, background: "rgba(56,211,153,0.12)", border: "1px solid rgba(56,211,153,0.35)", color: "#38D399", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        0{index + 1}
                      </div>
                      <p style={{ margin: 0, color: "#DCFCE7", fontSize: 14, lineHeight: 1.7 }}>{line}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ maxWidth: 320, ...fade(shareReveal.visible, 0.12) }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#38D399", marginBottom: 14 }}>Guest-friendly by design</p>
                <h3 style={{ fontSize: "clamp(22px,3vw,32px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.02em", marginBottom: 14, lineHeight: 1.2 }}>Start anonymous. Cash in when you&apos;re ready.</h3>
                <p style={{ color: "#9CA3AF", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                  The homepage now gives players the real daily puzzle immediately. Guest solves are saved, and signing up is the handoff that turns those saved wins into permanent rewards and streak history.
                </p>
                <div style={{ display: "grid", gap: 10 }}>
                  <Link href="/auth/register?reason=rewards" className="pw-cta" style={{ padding: "13px 28px", borderRadius: 10, fontWeight: 800, fontSize: 14, color: "#020202", background: "linear-gradient(135deg, #38D399 0%, #FDE74C 100%)", border: "1px solid rgba(56,211,153,0.35)", textAlign: "center", textDecoration: "none" }}>
                    Create Free Account
                  </Link>
                  <Link href="/daily" style={{ padding: "13px 28px", borderRadius: 10, fontWeight: 700, fontSize: 14, color: "#9BD6E4", background: "rgba(56,145,166,0.08)", border: "1px solid rgba(56,145,166,0.35)", textAlign: "center", textDecoration: "none" }}>
                    Open the full daily page
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={finalReveal.ref}
          className="hw-final-section"
          style={{ padding: "132px 20px", textAlign: "center", background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(56,211,153,0.08) 0%, transparent 72%)", borderTop: "1px solid rgba(56,211,153,0.12)" }}
        >
          <div style={{ maxWidth: 620, margin: "0 auto" }}>
            <h2 style={{ fontSize: "clamp(32px,5vw,60px)", fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.02, marginBottom: 24, ...fade(finalReveal.visible, 0) }}>
              Solve today&apos;s word.
              <br />
              <span className="pw-shimmer-text">Then keep going.</span>
            </h2>
            <p style={{ color: "#9CA3AF", fontSize: 16, lineHeight: 1.8, marginBottom: 40, ...fade(finalReveal.visible, 0.12) }}>
              The daily opener flips again in <strong style={{ color: "#FDE74C", fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace" }}>{countdown}</strong>. Solve it first, then spend the rest of the session wherever the catalog pulls you.
            </p>
            <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, ...fade(finalReveal.visible, 0.22) }}>
              <Link href="/daily" className="pw-cta" style={{ padding: "18px 46px", borderRadius: 10, fontWeight: 900, fontSize: 17, letterSpacing: "0.04em", color: "#020202", background: "linear-gradient(135deg, #38D399 0%, #FDE74C 100%)", boxShadow: "0 0 52px rgba(56,211,153,0.24)", textDecoration: "none", display: "inline-block", transition: "transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.02)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 74px rgba(56,211,153,0.3)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 52px rgba(56,211,153,0.24)"; }}
              >Play Daily Hidden Word</Link>
              <Link href="/puzzles" style={{ padding: "18px 32px", borderRadius: 10, fontWeight: 700, fontSize: 16, color: "#9CA3AF", background: "transparent", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none", display: "inline-block", transition: "border-color 0.2s, color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.32)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >Browse the Library</Link>
            </div>
            <p style={{ marginTop: 20, fontSize: 12, color: "#6B7280", ...fade(finalReveal.visible, 0.3) }}>Fast opener. Long tail. Better session flow.</p>
          </div>
        </section>

        <footer style={{ padding: "56px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <div className="hw-footer-inner" style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <img src="/images/puzzle_warz_logo.png" alt="PuzzleWarz" style={{ height: 28, width: "auto" }} />
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#38D399" }}>PuzzleWarz</span>
              </div>
              <p style={{ color: "#9CA3AF", fontSize: 12, maxWidth: 250, lineHeight: 1.65 }}>
                Daily Hidden Word first. Gridlock files, crosswords, and the rest of the catalog right behind it.
              </p>
            </div>
            <div className="hw-footer-nav" style={{ display: "flex", gap: 48, fontSize: 14, flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 4 }}>Play</p>
                {[["Daily Hidden Word", "/daily"], ["Puzzle Library", "/puzzles"], ["Leaderboard", "/leaderboard"], ["Warz Battles", competeHref]].map(([label, href]) => (
                  <Link key={label} href={href} style={{ color: "#9CA3AF", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                  >{label}</Link>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9CA3AF", marginBottom: 4 }}>Account</p>
                {[["Sign Up Free", "/auth/register"], ["Sign In", "/auth/signin"], ["Achievements", "/auth/register"]].map(([label, href]) => (
                  <Link key={label} href={href} style={{ color: "#9CA3AF", textDecoration: "none", transition: "color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9CA3AF")}
                  >{label}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hw-footer-bottom" style={{ paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <p style={{ color: "#6B7280", fontSize: 12 }}>&copy; 2026 PuzzleWarz · All rights reserved</p>
            <p style={{ color: "#6B7280", fontSize: 12 }}>Start fast. Stay sharp. Finish strong.</p>
          </div>
        </footer>
      </main>
    </>
  );
}