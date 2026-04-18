"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";import GridlockHomepageCard from "@/components/gridlock/GridlockHomepageCard";

/* -----------------------------------------------------------------
   Hooks
----------------------------------------------------------------- */
function useReveal(threshold = 0.1) {
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

function useCountdown() {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      setSecs(Math.floor((midnight.getTime() - now.getTime()) / 1000));
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

/* -----------------------------------------------------------------
   Fade helper
----------------------------------------------------------------- */
const fade = (visible: boolean, delay = 0, y = 28): React.CSSProperties => ({
  opacity: visible ? 1 : 0,
  transform: visible ? "translateY(0)" : `translateY(${y}px)`,
  transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
});

/* -----------------------------------------------------------------
   Share card example
----------------------------------------------------------------- */
const EXAMPLE_SHARE = `🔐 GRIDLOCK FILE #247
+- 🟩🟩🟩🟩🟩⬜⬜⬜⬜⬜
+- Rank: S  ·  2 attempts
+- Law: CONFIRMED ✓
+- ⏱️ 1:42  🔥 7-day arc complete

puzzlewarz.com/gridlock`;

/* -----------------------------------------------------------------
   Main
----------------------------------------------------------------- */
export default function HomeClient() {
  const [heroVisible, setHeroVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandGridlock, setExpandGridlock] = useState(false);
  const countdown = useCountdown();
  const { data: session } = useSession();
  const competeHref = session ? '/warz' : '/auth/register';

  // Recent solves feed
  type FeedItem = { id: string; username: string; isBot: boolean; level: number; rank: string; elapsedSeconds: number; fileTitle: string | null; fileNumber: number | null; minsAgo: number };
  const [recentSolves, setRecentSolves] = useState<FeedItem[]>([]);
  useEffect(() => {
    fetch('/api/gridlock/recent-solves')
      .then(r => r.ok ? r.json() : { feed: [] })
      .then(d => setRecentSolves(d.feed ?? []))
      .catch(() => {});
  }, []);

  const gridlockReveal = useReveal();
  const howReveal      = useReveal();
  const shareReveal    = useReveal();
  const featuresReveal = useReveal();
  const finalReveal    = useReveal();

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleCopyShare = useCallback(async () => {
    await navigator.clipboard.writeText(EXAMPLE_SHARE).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, []);

  return (
    <>
      <style>{`
        @keyframes pw-orb-float {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(55px,-35px) scale(1.07); }
          66%      { transform: translate(-28px,45px) scale(0.95); }
        }
        @keyframes pw-orb-float2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(-60px,28px) scale(1.05); }
          70%     { transform: translate(38px,-52px) scale(0.97); }
        }
        @keyframes pw-grid-in {
          from { opacity:0; } to { opacity:0.04; }
        }
        @keyframes pw-pulse-dot {
          0%,100% { box-shadow: 0 0 0 0 rgba(57,212,110,0.5); }
          50%     { box-shadow: 0 0 0 7px rgba(57,212,110,0); }
        }
        @keyframes pw-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pw-badge-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,208,0,0.4); }
          50%     { box-shadow: 0 0 0 9px rgba(255,208,0,0); }
        }
        .pw-shimmer-text {
          background: linear-gradient(90deg, #FFD700 0%, #fffbe6 38%, #FFD700 55%, #FFD700 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: pw-shimmer 3.5s linear infinite;
        }
        .pw-cta { position:relative; overflow:hidden; }
        .pw-cta::after {
          content:''; position:absolute; top:-50%; left:-60%; width:38%; height:200%;
          background:rgba(255,255,255,0.13); transform:skewX(-18deg);
          transition: left 0.5s ease;
        }
        .pw-cta:hover::after { left:130%; }
        .pw-stat-card { transition: transform 0.25s, box-shadow 0.25s; }
        .pw-stat-card:hover { transform: translateY(-5px); }
        .pw-feature { transition: transform 0.28s, border-color 0.22s, box-shadow 0.22s; }
        .pw-feature:hover { transform: translateY(-6px); }
        @media (max-width:700px) {
          .hero-btns { flex-direction: column !important; align-items:stretch !important; }
        }
        @media (max-width:640px) {
          .hw-hero { padding: 72px 16px 48px !important; }
          .hw-orb-1 { width: 260px !important; height: 260px !important; top: 4% !important; left: -4% !important; }
          .hw-orb-2 { display: none !important; }
          .hw-section { padding: 48px 16px !important; }
          .hw-steps-grid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .hw-share-wrap { flex-direction: column !important; gap: 20px !important; align-items: stretch !important; }
          .hw-share-pre { font-size: 12px !important; padding: 16px 14px !important; overflow-x: auto !important; max-width: 100% !important; }
          .hw-share-cta { max-width: 100% !important; }
          .hw-final-section { padding: 80px 16px !important; }
          .hw-footer-inner { flex-direction: column !important; gap: 28px !important; align-items: center !important; text-align: center !important; }
          .hw-footer-nav { flex-direction: column !important; gap: 28px !important; align-items: center !important; text-align: center !important; }
          .hw-footer-bottom { flex-direction: column !important; align-items: center !important; text-align: center !important; gap: 4px !important; }
          .hw-live-feed { padding: 10px 14px !important; }
          .hw-badge { font-size: 9px !important; padding: 4px 10px !important; }
        }
      `}</style>

      <main style={{ backgroundColor: "#010101", minHeight: "100vh", overflowX: "hidden", fontFamily: "system-ui, -apple-system, sans-serif" }}>

        {/* ------------------------------------------------------
            HERO
        ------------------------------------------------------ */}
        <section className="hw-hero" style={{ position: "relative", padding: "120px 20px 80px", overflow: "hidden", textAlign: "center" }}>
          <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
            <div className="hw-orb-1" style={{ position:"absolute", top:"8%", left:"12%", width:560, height:560, borderRadius:"50%", background:"radial-gradient(circle, rgba(255,208,0,0.13) 0%, transparent 68%)", animation:"pw-orb-float 20s ease-in-out infinite", filter:"blur(2px)" }} />
            <div className="hw-orb-2" style={{ position:"absolute", top:"25%", right:"8%", width:420, height:420, borderRadius:"50%", background:"radial-gradient(circle, rgba(56,145,166,0.12) 0%, transparent 68%)", animation:"pw-orb-float2 25s ease-in-out infinite" }} />
            <div style={{ position:"absolute", inset:0, backgroundImage:"radial-gradient(circle, rgba(255,208,0,0.45) 1px, transparent 1px)", backgroundSize:"34px 34px", animation:"pw-grid-in 2s ease forwards" }} />
            <div style={{ position:"absolute", inset:0, background:"radial-gradient(ellipse 90% 70% at 50% 50%, transparent 30%, #010101 100%)" }} />
          </div>

          <div style={{ maxWidth: 760, margin: "0 auto", position: "relative" }}>
            <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 14px", borderRadius:999, background:"rgba(57,212,110,0.07)", border:"1px solid rgba(57,212,110,0.25)", marginBottom:28, ...fade(heroVisible, 0) }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#39D46E", animation:"pw-pulse-dot 1.5s ease-in-out infinite" }} />
              <span className="hw-badge" style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#39D46E" }}>
                Daily puzzle · Free to play · No account needed
              </span>
            </div>

            <h1 style={{ fontSize:"clamp(52px,9vw,96px)", fontWeight:900, lineHeight:1.0, letterSpacing:"-0.035em", color:"#fff", margin:"0 0 8px", ...fade(heroVisible, 0.08) }}>Today&apos;s</h1>
            <h1 style={{ fontSize:"clamp(52px,9vw,96px)", fontWeight:900, lineHeight:1.0, letterSpacing:"-0.035em", margin:"0 0 8px", ...fade(heroVisible, 0.12) }}><span className="pw-shimmer-text">Gridlock File</span></h1>
            <h1 style={{ fontSize:"clamp(52px,9vw,96px)", fontWeight:900, lineHeight:1.0, letterSpacing:"-0.035em", color:"#fff", margin:"0 0 32px", ...fade(heroVisible, 0.16) }}>Is Live.</h1>

            <p style={{ fontSize:19, color:"#9CA3AF", maxWidth:500, margin:"0 auto 10px", lineHeight:1.7, ...fade(heroVisible, 0.24) }}>Find the hidden rule. Solve the grid.</p>
            <p style={{ fontSize:16, color:"#4B5563", maxWidth:440, margin:"0 auto 48px", lineHeight:1.7, ...fade(heroVisible, 0.28) }}>Build your 7-day arc streak. Decode the transmission. See where you rank.</p>

            <div className="hero-btns" style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap", ...fade(heroVisible, 0.36) }}>
              <button onClick={() => { setExpandGridlock(true); setTimeout(() => document.getElementById('gridlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} className="pw-cta" style={{ padding:"16px 36px", borderRadius:10, fontWeight:800, fontSize:15, letterSpacing:"0.04em", color:"#000", background:"#FFD700", boxShadow:"0 0 44px rgba(255,208,0,0.5)", border:"none", cursor:"pointer", display:"inline-block", transition:"transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px) scale(1.03)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 64px rgba(255,208,0,0.75)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 44px rgba(255,208,0,0.5)"; }}
              >🔐 Solve Now · Free</button>
              <Link href={competeHref} style={{ padding:"16px 28px", borderRadius:10, fontWeight:600, fontSize:15, color:"#c4b5fd", background:"transparent", border:"1px solid rgba(167,139,250,0.35)", textDecoration:"none", display:"inline-block", transition:"border-color 0.2s, background 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.08)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.65)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(167,139,250,0.35)"; }}
              >⚔️ Compete Head-to-Head</Link>
            </div>

            <div style={{ marginTop:40, display:"flex", justifyContent:"center", alignItems:"center", gap:10, ...fade(heroVisible, 0.44) }}>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", textTransform:"uppercase", color:"#9ca3af" }}>Next file in</span>
              <span style={{ fontSize:18, fontWeight:800, fontFamily:"ui-monospace,monospace", color:"#FFD700", letterSpacing:"0.08em" }}>{countdown}</span>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------
            RECENT SOLVES FEED — social proof ticker
        ------------------------------------------------------ */}
        {recentSolves.length > 0 && (
          <div style={{ padding:"0 16px 0", overflow:"hidden" }}>
            <div className="hw-live-feed" style={{ maxWidth:1100, margin:"0 auto", borderRadius:12, border:"1px solid rgba(255,255,255,0.06)", background:"rgba(255,255,255,0.02)", padding:"12px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, overflowX:"auto", scrollbarWidth:"none", WebkitOverflowScrolling:"touch" }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#9ca3af", flexShrink:0 }}>📡 LIVE</span>
                {recentSolves.slice(0, 8).map(s => {
                  const rankColor: Record<string, string> = { S:"#FFD700", A:"#7DF9AA", B:"#60a5fa", C:"#f97316", F:"#ef4444" };
                  const mins = s.minsAgo < 1 ? "just now" : s.minsAgo < 60 ? `${s.minsAgo}m ago` : `${Math.floor(s.minsAgo/60)}h ago`;
                  return (
                    <div key={s.id} style={{ display:"flex", alignItems:"center", gap:7, flexShrink:0, padding:"4px 10px", borderRadius:8, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)" }}>
                      <span style={{ fontSize:11, fontWeight:700, color: rankColor[s.rank] ?? "#9ca3af", fontFamily:"monospace" }}>{s.rank}</span>
                      <span style={{ fontSize:11, color:"#d1d5db", fontFamily:"monospace" }}>{s.username}</span>
                      {s.fileNumber && <span style={{ fontSize:10, color:"#9ca3af", fontFamily:"monospace" }}>#{String(s.fileNumber).padStart(3,"0")}</span>}
                      <span style={{ fontSize:10, color:"#9ca3af", fontFamily:"monospace" }}>{mins}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------
            GRIDLOCK FILE — THE CENTERPIECE
        ------------------------------------------------------ */}
        <section id="gridlock" className="hw-section" style={{ padding:"100px 20px 60px" }}>
          <div ref={gridlockReveal.ref} style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", borderRadius:999, background:"rgba(255,208,0,0.07)", border:"1px solid rgba(255,208,0,0.25)", marginBottom:20, animation:"pw-badge-pulse 2.5s ease-in-out infinite", ...fade(gridlockReveal.visible, 0) }}>
                <span style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#FFD700" }}>Daily Puzzle · Arc System Active</span>
              </div>
              <h2 style={{ fontSize:"clamp(28px,4.5vw,48px)", fontWeight:900, color:"#fff", letterSpacing:"-0.025em", marginBottom:14, lineHeight:1.1, ...fade(gridlockReveal.visible, 0.08) }}>Can You Crack Today&apos;s File?</h2>
              <p style={{ color:"#6B7280", fontSize:16, maxWidth:480, margin:"0 auto", lineHeight:1.7, ...fade(gridlockReveal.visible, 0.16) }}>
                Find the hidden rule. One file, one chance per day. Build your 7-day arc to decode the transmission.
              </p>
            </div>
            <div style={fade(gridlockReveal.visible, 0.22)}>
              <GridlockHomepageCard autoExpand={expandGridlock} />
            </div>
            <div style={{ display:"flex", justifyContent:"center", gap:12, marginTop:32, flexWrap:"wrap", ...fade(gridlockReveal.visible, 0.3) }}>
              {[
                { icon:"🔥", label:"Solve daily to extend your streak" },
                { icon:"📡", label:"7 days = arc transmission decoded" },
                { icon:"⚡", label:"Miss a day — arc resets" },
              ].map(p => (
                <div key={p.label} style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 16px", borderRadius:999, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", fontSize:13, color:"#6B7280" }}>
                  <span>{p.icon}</span><span>{p.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------
            HOW IT WORKS — minimal, provocative
        ------------------------------------------------------ */}
        <section className="hw-section" style={{ padding:"80px 20px", borderTop:"1px solid rgba(56,145,166,0.08)" }}>
          <div ref={howReveal.ref} style={{ maxWidth:900, margin:"0 auto", textAlign:"center" }}>
            <h2 style={{ fontSize:"clamp(26px,4vw,44px)", fontWeight:900, color:"#fff", letterSpacing:"-0.025em", marginBottom:14, ...fade(howReveal.visible, 0) }}>
              Find the hidden rule.<br />Solve the grid.<br /><span style={{ color:"#FFD700" }}>Beat everyone else.</span>
            </h2>
            <p style={{ color:"#4B5563", fontSize:16, maxWidth:440, margin:"0 auto 56px", lineHeight:1.7, ...fade(howReveal.visible, 0.1) }}>
              That&apos;s it. No tutorial needed. No hand-holding. Either you see it or you don&apos;t.
            </p>
            <div className="hw-steps-grid" style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:24, ...fade(howReveal.visible, 0.18) }}>
              {[
                { n:"01", title:"Study the Grid", body:"Every cell contains data. Most of it is noise. One pattern is the key.", icon:"🔍" },
                { n:"02", title:"Declare the Law", body:"Name the rule that governs the grid. Right or wrong — commit.", icon:"⚖️" },
                { n:"03", title:"Submit & Rank", body:"Correct? Your rank is set by speed and attempts. Can you hit S-tier?", icon:"🏆" },
              ].map(step => (
                <div key={step.n} style={{ padding:"28px 20px", borderRadius:16, background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.06)", transition:"border-color 0.2s, background 0.2s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,208,0,0.3)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,208,0,0.04)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.025)"; }}
                >
                  <div style={{ fontSize:28, marginBottom:16 }}>{step.icon}</div>
                  <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#FFD700", marginBottom:10 }}>{step.n}</p>
                  <h3 style={{ color:"#fff", fontWeight:700, fontSize:16, marginBottom:10 }}>{step.title}</h3>
                  <p style={{ color:"#6B7280", fontSize:14, lineHeight:1.65 }}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------
            SHARE / VIRAL HOOK
        ------------------------------------------------------ */}
        <section className="hw-section" style={{ padding:"80px 20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          <div ref={shareReveal.ref} style={{ maxWidth:800, margin:"0 auto" }}>
            <div className="hw-share-wrap" style={{ display:"flex", flexWrap:"wrap", gap:40, alignItems:"center", justifyContent:"center" }}>
              <div style={{ flexShrink:0, minWidth:0, ...fade(shareReveal.visible, 0) }}>
                <pre className="hw-share-pre" style={{ fontFamily:"ui-monospace,monospace", fontSize:14, lineHeight:1.9, color:"#d1fae5", background:"rgba(57,212,110,0.04)", border:"1px solid rgba(57,212,110,0.2)", borderRadius:14, padding:"24px 28px", whiteSpace:"pre", margin:0, overflowX:"auto" }}>{EXAMPLE_SHARE}</pre>
              </div>
              <div className="hw-share-cta" style={{ maxWidth:300, ...fade(shareReveal.visible, 0.12) }}>
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#39D46E", marginBottom:14 }}>Challenge Your Friends</p>
                <h3 style={{ fontSize:"clamp(22px,3vw,32px)", fontWeight:800, color:"#fff", letterSpacing:"-0.02em", marginBottom:14, lineHeight:1.2 }}>Share Your Result. Make It Personal.</h3>
                <p style={{ color:"#9ca3af", fontSize:15, lineHeight:1.7, marginBottom:24 }}>Every solve auto-generates a shareable card. Drop it in the group chat. Dare them to beat your time.</p>
                <button
                  onClick={handleCopyShare}
                  className="pw-cta"
                  style={{ padding:"13px 28px", borderRadius:10, fontWeight:700, fontSize:14, color: copied ? "#000" : "#fff", background: copied ? "#39D46E" : "rgba(57,212,110,0.12)", border:`1px solid ${copied ? "#39D46E" : "rgba(57,212,110,0.35)"}`, cursor:"pointer", transition:"all 0.2s", width:"100%" }}
                >{copied ? "✓ Copied!" : "📋 Copy Example Result"}</button>
                <p style={{ fontSize:12, color:"#9ca3af", marginTop:12, textAlign:"center" }}>Your real result includes your score and arc progress.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------
            SECONDARY FEATURES
        ------------------------------------------------------ */}
        <section className="hw-section" style={{ padding:"80px 20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
          <div ref={featuresReveal.ref} style={{ maxWidth:1100, margin:"0 auto" }}>
            <div style={{ textAlign:"center", marginBottom:48 }}>
              <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#9ca3af", marginBottom:12, ...fade(featuresReveal.visible, 0) }}>The Full Arsenal</p>
              <h2 style={{ fontSize:"clamp(24px,4vw,40px)", fontWeight:800, color:"#fff", letterSpacing:"-0.025em", marginBottom:12, ...fade(featuresReveal.visible, 0.08) }}>The Gridlock File is just the beginning.</h2>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:18 }}>
              {[
                { icon:"⚔️", title:"Warz Battles", tag:"Live Now", tagColor:"#39D46E", body:"Challenge any player head-to-head on the same puzzle. Wager points. The faster solver takes the pot.", href:"/warz", cta:"Enter the Arena" },
                { icon:"🔓", title:"Escape Rooms", tag:"Coming Soon", tagColor:"#38bdf8", body:"Collaborative multi-stage rooms where every puzzle unlocks the next. Timer running. No one gets out alone.", href:"/auth/register", cta:"Join the Waitlist" },
                { icon:"🕵️", title:"Detective Cases", tag:"Coming Soon", tagColor:"#a78bfa", body:"Multi-chapter crime cases with evidence boards, witness interviews, and branching narratives. Only top solvers get access.", href:"/auth/register", cta:"Get Early Access" },
                { icon:"🌐", title:"ARG Experiences", tag:"Coming Soon", tagColor:"#f97316", body:"Alternate reality puzzles that bleed into the real world. Ciphers, coordinates, hidden messages. You can't Google this.", href:"/auth/register", cta:"Join the Waitlist" },
                { icon:"🏆", title:"Ranked Seasons", tag:"Live Now", tagColor:"#FFD700", body:"3-month seasons. Top players earn exclusive card backs, titles, and first access to new puzzle types.", href:"/leaderboard", cta:"See Current Rankings" },
              ].map((f, i) => (
                <div
                  key={f.title}
                  className="pw-feature"
                  style={{ padding:"26px 22px", borderRadius:16, background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", display:"flex", flexDirection:"column", gap:12, opacity: featuresReveal.visible ? 1 : 0, transform: featuresReveal.visible ? "translateY(0)" : "translateY(28px)", transition:`opacity 0.6s ease ${0.05+i*0.1}s, transform 0.6s ease ${0.05+i*0.1}s, border-color 0.22s, box-shadow 0.22s` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${f.tagColor}40`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 40px ${f.tagColor}12`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                >
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <span style={{ fontSize:22 }}>{f.icon}</span>
                    <span style={{ fontSize:11, fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", padding:"3px 10px", borderRadius:999, color:f.tagColor, background:`${f.tagColor}14`, border:`1px solid ${f.tagColor}30` }}>{f.tag}</span>
                  </div>
                  <h3 style={{ color:"#fff", fontWeight:700, fontSize:17, margin:0 }}>{f.title}</h3>
                  <p style={{ color:"#9ca3af", fontSize:14, lineHeight:1.65, flexGrow:1, margin:0 }}>{f.body}</p>
                  <Link href={f.href} style={{ fontSize:13, fontWeight:700, color:f.tagColor, textDecoration:"none", borderBottom:`1px solid ${f.tagColor}30`, paddingBottom:2, alignSelf:"flex-start", transition:"border-color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = f.tagColor)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = `${f.tagColor}30`)}
                  >{f.cta} →</Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------
            FINAL CTA
        ------------------------------------------------------ */}
        <section
          ref={finalReveal.ref}
          className="hw-final-section"
          style={{ padding:"140px 20px", textAlign:"center", background:"radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,208,0,0.07) 0%, transparent 70%)", borderTop:"1px solid rgba(255,208,0,0.1)" }}
        >
          <div style={{ maxWidth:580, margin:"0 auto" }}>
            <h2 style={{ fontSize:"clamp(32px,5vw,64px)", fontWeight:900, color:"#fff", letterSpacing:"-0.03em", lineHeight:1.0, marginBottom:24, ...fade(finalReveal.visible, 0) }}>
              I HAVE TO<br /><span className="pw-shimmer-text">TRY THIS</span><br />RIGHT NOW.
            </h2>
            <p style={{ color:"#9ca3af", fontSize:16, lineHeight:1.8, marginBottom:40, ...fade(finalReveal.visible, 0.12) }}>
              That instinct is correct. Today&apos;s file resets in{" "}
              <strong style={{ color:"#FFD700", fontFamily:"ui-monospace,monospace" }}>{countdown}</strong>.
              Miss it and the arc breaks.
            </p>
            <div style={{ display:"flex", justifyContent:"center", flexWrap:"wrap", gap:12, ...fade(finalReveal.visible, 0.22) }}>
              <button onClick={() => { setExpandGridlock(true); setTimeout(() => document.getElementById('gridlock')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }} className="pw-cta" style={{ padding:"18px 52px", borderRadius:10, fontWeight:900, fontSize:17, letterSpacing:"0.04em", color:"#000", background:"#FFD700", boxShadow:"0 0 56px rgba(255,208,0,0.55)", border:"none", cursor:"pointer", display:"inline-block", transition:"transform 0.2s, box-shadow 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-3px) scale(1.03)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 80px rgba(255,208,0,0.8)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 56px rgba(255,208,0,0.55)"; }}
              >🔐 Solve Today&apos;s File</button>
              <Link href="/auth/register" style={{ padding:"18px 32px", borderRadius:10, fontWeight:600, fontSize:16, color:"#9CA3AF", background:"transparent", border:"1px solid rgba(255,255,255,0.12)", textDecoration:"none", display:"inline-block", transition:"border-color 0.2s, color 0.2s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.35)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#9CA3AF"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >Create Free Account</Link>
            </div>
            <p style={{ marginTop:20, fontSize:12, color:"#6b7280", ...fade(finalReveal.visible, 0.3) }}>No credit card. No install. No excuses.</p>
          </div>
        </section>

        {/* ------------------------------------------------------
            FOOTER
        ------------------------------------------------------ */}
        <footer style={{ padding:"56px 20px", borderTop:"1px solid rgba(255,255,255,0.05)" }}>
          <div className="hw-footer-inner" style={{ maxWidth:1100, margin:"0 auto", display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-start", gap:40, marginBottom:40 }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                <img src="/images/puzzle_warz_logo.png" alt="PuzzleWarz" style={{ height:28, width:"auto" }} />
                <span style={{ fontSize:13, fontWeight:800, letterSpacing:"0.1em", textTransform:"uppercase", color:"#FFD700" }}>PuzzleWarz</span>
              </div>
              <p style={{ color:"#9ca3af", fontSize:12, maxWidth:220, lineHeight:1.6 }}>Daily puzzles. Live leaderboards. Head-to-head battles.</p>
            </div>
            <div className="hw-footer-nav" style={{ display:"flex", gap:48, fontSize:14, flexWrap:"wrap" }}>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#9ca3af", marginBottom:4 }}>Play</p>
                {[["Gridlock File", "#gridlock"], ["Warz Battles", "/warz"], ["Leaderboard", "/leaderboard"], ["Daily Puzzle", "/frequency"]].map(([l, h]) => (
                  <Link key={l} href={h} style={{ color:"#9ca3af", textDecoration:"none", transition:"color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                  >{l}</Link>
                ))}
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <p style={{ fontSize:10, fontWeight:700, letterSpacing:"0.16em", textTransform:"uppercase", color:"#9ca3af", marginBottom:4 }}>Account</p>
                {[["Sign Up Free", "/auth/register"], ["Sign In", "/auth/signin"], ["Achievements", "/auth/register"]].map(([l, h]) => (
                  <Link key={l} href={h} style={{ color:"#9ca3af", textDecoration:"none", transition:"color 0.2s" }}
                    onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                    onMouseLeave={e => (e.currentTarget.style.color = "#9ca3af")}
                  >{l}</Link>
                ))}
              </div>
            </div>
          </div>
          <div className="hw-footer-bottom" style={{ paddingTop:20, borderTop:"1px solid rgba(255,255,255,0.04)", display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:8, alignItems:"center" }}>
            <p style={{ color:"#6b7280", fontSize:12 }}>&copy; 2026 PuzzleWarz · All rights reserved</p>
            <p style={{ color:"#6b7280", fontSize:12 }}>Train your mind. Earn your rank.</p>
          </div>
        </footer>

      </main>
    </>
  );
}
