"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import Navbar from "@/components/Navbar";

// ── Constants ────────────────────────────────────────────────────────────────
const WORD_LEN = 5;
const MAX_ROWS = 6;
const KB_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
];
const WIN_MSGS = ["⚡ LEGENDARY!", "🔓 MASTERCRACK!", "💥 IMPRESSIVE!", "👏 NICE WORK!", "😅 BARELY CRACKED!", "😤 BY A THREAD!"];
const EMOJI = { correct: "🟩", present: "🟨", absent: "⬛" } as const;

type TileState = "correct" | "present" | "absent" | "tbd" | "empty";

// ── Colours (matching new WordCrack style) ───────────────────────────────────
const COLORS = {
  correct: { bg: "#38D399", border: "#10b981", glow: "rgba(56,211,153,0.65)" },
  present: { bg: "#FDE74C", border: "#d97706", glow: "rgba(253,231,76,0.65)" },
  absent:  { bg: "rgba(56,145,166,0.22)", border: "rgba(56,145,166,0.5)", glow: "none" },
  empty:   { bg: "transparent", border: "#374151", glow: "none" },
  active:  { bg: "rgba(253,231,76,0.08)", border: "#FDE74C", glow: "rgba(253,231,76,0.3)" },
} as const;

// ── Confetti ─────────────────────────────────────────────────────────────────
interface Particle { id: number; x: number; color: string; delay: number; duration: number; size: number }
function makeConfetti(): Particle[] {
  const palette = ["#38D399","#FDE74C","#3891A6","#f472b6","#818cf8","#fb923c"];
  return Array.from({ length: 60 }, (_, i) => ({
    id: i, x: Math.random() * 100, color: palette[i % palette.length],
    delay: Math.random() * 0.6, duration: 0.8 + Math.random() * 0.8, size: 6 + Math.random() * 8,
  }));
}

// ── Game logic ────────────────────────────────────────────────────────────────
function evaluate(guess: string, target: string): TileState[] {
  const result: TileState[] = Array(WORD_LEN).fill("absent");
  const pool = target.split("");
  guess.split("").forEach((c, i) => {
    if (c === pool[i]) { result[i] = "correct"; pool[i] = "#"; }
  });
  guess.split("").forEach((c, i) => {
    if (result[i] !== "absent") return;
    const idx = pool.indexOf(c);
    if (idx !== -1) { result[i] = "present"; pool[idx] = "#"; }
  });
  return result;
}

function buildKeyMap(guesses: string[], target: string): Record<string, TileState> {
  const priority: Record<TileState, number> = { correct: 3, present: 2, absent: 1, tbd: 0, empty: 0 };
  const map: Record<string, TileState> = {};
  guesses.forEach(g => {
    evaluate(g, target).forEach((st, i) => {
      const c = g[i];
      if ((priority[st] ?? 0) > (priority[map[c] ?? "empty"] ?? 0)) map[c] = st;
    });
  });
  return map;
}

function getTileStyle(st: TileState, isActive = false): { bg: string; border: string; color: string; glow: string } {
  if (st === "correct") return { ...COLORS.correct, color: "#020202" };
  if (st === "present") return { ...COLORS.present, color: "#020202" };
  if (st === "absent")  return { ...COLORS.absent,  color: "#9ca3af" };
  if (isActive)         return { ...COLORS.active,  color: "#FFF" };
  return { ...COLORS.empty, color: "#FFF" };
}

function getGrade(count: number): { grade: string; color: string } {
  if (count === 1) return { grade: "S", color: "#38D399" };
  if (count === 2) return { grade: "A", color: "#a3e635" };
  if (count <= Math.ceil(MAX_ROWS * 0.5)) return { grade: "B", color: "#FDE74C" };
  if (count <= Math.ceil(MAX_ROWS * 0.75)) return { grade: "C", color: "#f97316" };
  return { grade: "D", color: "#ef4444" };
}

// ── Countdown util ────────────────────────────────────────────────────────────
function getCountdown(): string {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(24, 0, 0, 0);
  const d = next.getTime() - now.getTime();
  const hh = String(Math.floor(d / 3_600_000)).padStart(2, "0");
  const mm = String(Math.floor((d % 3_600_000) / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((d % 60_000) / 1_000)).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

// ── Instructions modal ───────────────────────────────────────────────────────
function InstructionsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.88)" }}>
      <div className="relative w-full max-w-md rounded-2xl p-6 text-white"
           style={{ background: "linear-gradient(135deg,#040e0a 0%,#0c1a14 100%)", border: "1px solid rgba(56,211,153,0.3)", boxShadow: "0 0 40px rgba(56,211,153,0.15),0 25px 50px rgba(0,0,0,0.6)" }}>
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">⚡</div>
          <h2 className="text-2xl font-black tracking-widest" style={{ color: "#38D399" }}>HOW TO CRACK IT</h2>
          <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Decode the hidden 5-letter word.</p>
        </div>
        <ul className="space-y-3 text-sm mb-6">
          <li className="flex items-start gap-3"><span className="text-lg">🎯</span><span>You have <strong className="text-white">{MAX_ROWS} attempts</strong> to crack the word.</span></li>
          <li className="flex items-start gap-3"><span className="text-lg">⌨️</span><span>Type a word and press <strong className="text-white">ENTER</strong>. Each tile flips to reveal intel.</span></li>
          <li className="flex items-start gap-3"><span className="text-lg">📊</span><span>Crack faster for a better <strong className="text-white">grade</strong> — S, A, B, C, or D.</span></li>
        </ul>
        <div className="space-y-3 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#9ca3af" }}>Tile intel codes:</p>
          {([
            { st: "correct", label: "CRACKED", desc: "right letter, right position", letter: "C" },
            { st: "present", label: "CLOSE",   desc: "letter exists, wrong position", letter: "P" },
            { st: "absent",  label: "COLD",    desc: "letter not in word", letter: "X" },
          ] as const).map(({ st, label, desc, letter }) => {
            const c = COLORS[st];
            return (
              <div key={st} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg"
                     style={{ background: c.bg, boxShadow: `0 0 12px ${c.glow}`, color: st === "absent" ? "#9ca3af" : "#020202" }}>
                  {letter}
                </div>
                <span className="text-sm">
                  <strong className="text-white">{label}</strong>
                  <span style={{ color: "#9ca3af" }}> — {desc}</span>
                </span>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} className="w-full py-3 rounded-xl font-black text-lg tracking-widest active:scale-95 transition-all"
                style={{ background: "linear-gradient(135deg,#10b981,#38D399)", boxShadow: "0 0 20px rgba(56,211,153,0.4)", color: "#020202" }}>
          START CRACKING ⚡
        </button>
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export default function DailyPage() {
  const { data: session } = useSession();
  const sessionUid = session?.user?.email ?? session?.user?.name ?? "";
  const [word, setWord]           = useState("");
  const [dayNum, setDayNum]       = useState(0);
  const [guesses, setGuesses]     = useState<string[]>([]);
  const [curr, setCurr]           = useState("");
  const [status, setStatus]       = useState<"playing" | "won" | "lost">("playing");
  const [keyMap, setKeyMap]       = useState<Record<string, TileState>>({});
  const [msg, setMsg]             = useState("");
  const [shaking, setShaking]     = useState(false);
  const [revealing, setRevealing] = useState<number | null>(null);
  const [revealedCols, setRevealedCols] = useState(0);
  const [countdown, setCountdown] = useState(getCountdown());
  const [copied, setCopied]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [skipTokens, setSkipTokens]   = useState(0);
  const [shieldNotice, setShieldNotice] = useState(false);
  const [skipping, setSkipping]       = useState(false);
  const [streakDay, setStreakDay]     = useState(1);
  const [nextReward, setNextReward]   = useState<{ points: number; xp: number } | null>(null);
  const [earnedReward, setEarnedReward] = useState<{ points: number; xp: number; streakDay: number } | null>(null);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [showUpgradeOffer, setShowUpgradeOffer] = useState(false);
  // New WordCrack-style state
  const [confetti, setConfetti]     = useState<Particle[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [popCol, setPopCol]         = useState<number | null>(null);
  const boardRef                    = useRef<HTMLDivElement>(null);
  const [tileSize, setTileSize]     = useState(58);

  const dateKey  = new Date().toISOString().slice(0, 10);
  const storeKey = sessionUid ? `pw_daily_${dateKey}_${sessionUid}` : `pw_daily_${dateKey}`;
  const instrKey = "pw_daily_htp_seen";

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setGuesses([]);
    setCurr("");
    setStatus("playing");
    setKeyMap({});
    setLoading(true);
    setEarnedReward(null);
    setShowRewardModal(false);

    fetch("/api/daily/word")
      .then(r => r.json())
      .then(d => {
        setWord(d.word);
        setDayNum(d.number);
        try {
          const saved = JSON.parse(localStorage.getItem(storeKey) || "null");
          if (saved?.guesses) {
            setGuesses(saved.guesses);
            setStatus(saved.status ?? "playing");
            setKeyMap(buildKeyMap(saved.guesses, d.word));
          }
          // Show instructions only the very first time
          const seen = localStorage.getItem(instrKey);
          if (!seen && !saved?.guesses) setShowInstructions(true);
        } catch { /* ignore */ }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/daily/complete")
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setDailyStreak(d.streak ?? 0);
          setSkipTokens(d.skipTokens ?? 0);
          setStreakDay(d.streakDay ?? 1);
          if (d.nextReward) setNextReward(d.nextReward);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

  // ── Board-responsive tile sizing ─────────────────────────────────────────
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const update = () => {
      const inner = el.clientWidth - 32;
      const gaps = (WORD_LEN - 1) * 4;
      const size = Math.max(38, Math.min(64, Math.floor((inner - gaps) / WORD_LEN)));
      setTileSize(size);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  // ── Countdown ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setCountdown(getCountdown()), 1_000);
    return () => clearInterval(id);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const flash = (text: string, ms = 2_000) => {
    setMsg(text);
    setTimeout(() => setMsg(""), ms);
  };

  const recordCompletion = (won: boolean, numGuesses: number) => {
    fetch("/api/daily/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ won, guesses: numGuesses }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.shieldUsed) setShieldNotice(true);
        if (d.reward) {
          setEarnedReward(d.reward);
          setShowRewardModal(true);
        }
        if (d.showUpgradeOffer) setShowUpgradeOffer(true);
        // Refresh streak + next reward
        return fetch("/api/daily/complete");
      })
      .then(r => r && r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setDailyStreak(d.streak ?? 0);
          setStreakDay(d.streakDay ?? 1);
          if (d.nextReward) setNextReward(d.nextReward);
        }
      })
      .catch(() => {/* ignore */});
  };

  const handleSkip = async () => {
    if (skipping || skipTokens < 1 || status !== "playing") return;
    setSkipping(true);
    try {
      const res = await fetch("/api/daily/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (res.ok) {
        setSkipTokens(t => t - 1);
        const gs = "lost";
        save(guesses, gs);
        setStatus(gs);
        flash("Today's puzzle skipped! Streak preserved. 🛡️", 4_000);
        // Refresh streak
        fetch("/api/daily/complete")
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d) setDailyStreak(d.streak ?? 0); })
          .catch(() => {});
      } else {
        const data = await res.json();
        flash(data.error || "Failed to skip", 3_000);
      }
    } catch {
      flash("Failed to skip puzzle", 3_000);
    } finally {
      setSkipping(false);
    }
  };

  const save = (g: string[], s: "playing" | "won" | "lost") =>
    localStorage.setItem(storeKey, JSON.stringify({ guesses: g, status: s }));

  // ── Input ─────────────────────────────────────────────────────────────────
  const type = useCallback((letter: string) => {
    if (status !== "playing" || curr.length >= WORD_LEN) return;
    setPopCol(curr.length);
    setTimeout(() => setPopCol(null), 120);
    setCurr(c => c + letter);
  }, [status, curr.length]);

  const del = useCallback(() => {
    if (status !== "playing") return;
    setCurr(c => c.slice(0, -1));
  }, [status]);

  const submit = useCallback(() => {
    if (status !== "playing") return;
    if (curr.length < WORD_LEN) {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
      flash("Not enough letters");
      return;
    }

    const next    = [...guesses, curr];
    const newKeys = buildKeyMap(next, word);
    const rowIdx  = guesses.length;

    setGuesses(next);
    setCurr("");
    setRevealing(rowIdx);
    setRevealedCols(0);

    // Stagger color reveals: each tile shows its result color at the mid-point of its flip
    for (let c = 0; c < WORD_LEN; c++) {
      setTimeout(() => setRevealedCols(c + 1), c * 120 + 60);
    }

    // Update key colors only after all tiles have flipped
    setTimeout(() => setKeyMap(newKeys), WORD_LEN * 120 + 60);

    // Clear reveal class after animation (5 tiles × 120ms + 500ms)
    setTimeout(() => setRevealing(null), WORD_LEN * 120 + 520);

    if (curr === word) {
      const gs = "won";
      save(next, gs);
      setTimeout(() => {
        setStatus(gs);
        setConfetti(makeConfetti());
        flash(WIN_MSGS[Math.min(guesses.length, 5)], 3_000);
      }, WORD_LEN * 120 + 600);
      setTimeout(() => recordCompletion(true, next.length), WORD_LEN * 120 + 700);
    } else if (next.length >= MAX_ROWS) {
      const gs = "lost";
      save(next, gs);
      setTimeout(() => { setStatus(gs); flash(word, 5_000); }, WORD_LEN * 120 + 600);
      setTimeout(() => recordCompletion(false, next.length), WORD_LEN * 120 + 700);
    } else {
      save(next, "playing");
    }
  }, [status, curr, guesses, word]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter")           submit();
      else if (e.key === "Backspace")  del();
      else if (/^[a-zA-Z]$/.test(e.key)) type(e.key.toUpperCase());
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [submit, del, type]);

  // ── Share ─────────────────────────────────────────────────────────────────
  const buildShareText = () => {
    const rows = guesses.map(g =>
      evaluate(g, word).map(s => EMOJI[s as keyof typeof EMOJI] ?? "⬛").join("")
    );
    const score = status === "won" ? `${guesses.length}/${MAX_ROWS}` : `X/${MAX_ROWS}`;
    const streakLine = dailyStreak > 0
      ? (status === "won"
        ? `\n🔥 ${dailyStreak}-day streak`
        : `\n😔 Streak broken at ${dailyStreak} days`)
      : "";
    const taunt = status === "won" ? "\nThink you can beat it? 👇" : "\nI'll get it tomorrow. 💪";
    return `⚔️ PuzzleWarz Daily #${dayNum} — ${score}\n\n${rows.join("\n")}${streakLine}${taunt}`;
  };
  const shareUrl = "https://puzzlewarz.com/daily";

  const handleShareTwitter = () => {
    const text = buildShareText();
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text + "\n" + shareUrl)}`, "_blank", "width=600,height=500");
  };
  const handleShareFacebook = () => {
    const text = buildShareText();
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
  };
  const handleShareWhatsApp = () => {
    const text = buildShareText();
    window.open(`https://wa.me/?text=${encodeURIComponent(text + "\n" + shareUrl)}`, "_blank");
  };
  const handleShareReddit = () => {
    const text = buildShareText();
    window.open(`https://reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
  };
  const handleShareTelegram = () => {
    const text = buildShareText();
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(text)}`, "_blank", "width=600,height=500");
  };
  const handleShareCopy = async () => {
    const text = buildShareText();
    try {
      await navigator.clipboard.writeText(text + "\n" + shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2_500);
    } catch { /* ignore */ }
  };

  // ── Build grid ────────────────────────────────────────────────────────────
  // Only show played rows + current active row (no blank ghost rows below)
  const displayRowCount = status === "playing" ? guesses.length + 1 : guesses.length;
  const grid = Array.from({ length: Math.min(displayRowCount, MAX_ROWS) }, (_, r): { l: string; st: TileState }[] => {
    if (r < guesses.length) {
      const ev = evaluate(guesses[r], word);
      return Array.from({ length: WORD_LEN }, (_, c) => ({ l: guesses[r][c], st: ev[c] }));
    }
    if (r === guesses.length && status === "playing") {
      return Array.from({ length: WORD_LEN }, (_, c) => ({
        l:  curr[c] ?? "",
        st: (curr[c] ? "tbd" : "empty") as TileState,
      }));
    }
    return Array.from({ length: WORD_LEN }, () => ({ l: "", st: "empty" as TileState }));
  });

  const grade = status === "won" ? getGrade(guesses.length) : null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: "#020202", minHeight: "100vh" }}>
      <Navbar />

      {/* Instructions modal */}
      {showInstructions && (
        <InstructionsModal onClose={() => {
          try { localStorage.setItem(instrKey, "1"); } catch { /* ignore */ }
          setShowInstructions(false);
        }} />
      )}

      {/* Confetti */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden">
          {confetti.map(p => (
            <div key={p.id} className="absolute rounded-sm"
                 style={{ left: `${p.x}%`, top: "-10px", width: p.size, height: p.size * 0.6,
                          background: p.color,
                          animation: `wc-fall ${p.duration}s ${p.delay}s ease-in forwards` }} />
          ))}
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes pw-shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-8px)}30%{transform:translateX(8px)}
          45%{transform:translateX(-5px)}60%{transform:translateX(5px)}
          75%{transform:translateX(-3px)}90%{transform:translateX(3px)}
        }
        @keyframes pw-pop {
          0%,100%{transform:scale(1)}50%{transform:scale(1.13)}
        }
        @keyframes pw-reveal {
          0%{transform:rotateX(0deg)}
          49%{transform:rotateX(-90deg);opacity:0.4}
          50%{transform:rotateX(-90deg);opacity:1}
          100%{transform:rotateX(0deg)}
        }
        @keyframes pw-fadein {
          from{opacity:0;transform:translateY(-6px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes pw-bounce {
          0%,100%{transform:translateY(0)}33%{transform:translateY(-18px)}66%{transform:translateY(-8px)}
        }
        @keyframes wc-fall {
          to{transform:translateY(110vh) rotate(720deg);opacity:0}
        }
        @keyframes pw-modal-in {
          from{opacity:0;transform:scale(0.82)}to{opacity:1;transform:scale(1)}
        }
        @keyframes pw-counter {
          from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}
        }
        @keyframes pw-glow {
          0%,100%{box-shadow:0 0 20px rgba(253,231,76,0.15)}50%{box-shadow:0 0 40px rgba(253,231,76,0.35)}
        }
        .pw-shake  { animation: pw-shake  0.6s ease; }
        .pw-pop    { animation: pw-pop    0.12s ease; }
        .pw-fadein { animation: pw-fadein 0.25s ease; }
        .pw-bounce { animation: pw-bounce 0.7s ease; }
        .pw-modal-in  { animation: pw-modal-in  0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .pw-counter   { animation: pw-counter   0.5s ease both; }
        .pw-glow      { animation: pw-glow      2s ease-in-out infinite; }
      `}</style>

      <main className="pt-24 pb-16 flex flex-col items-center px-2">

        {/* ── Header ── */}
        <div className="w-full max-w-xs mt-6 mb-4 text-center pb-4" style={{ borderBottom: "1px solid #1C1C1C" }}>
          <div className="relative flex items-center justify-center mb-0">
            <div className="flex flex-col items-center">
              <span className="text-xs font-bold tracking-widest" style={{ color: "#3891A6" }}>PUZZLE WARZ</span>
              <h1 className="text-3xl font-black tracking-[0.25em] text-white">DAILY</h1>
            </div>
            <div className="absolute right-0 flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "#444" }}>#{dayNum}</span>
              <button onClick={() => setShowInstructions(true)}
                      className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                      style={{ background: "rgba(56,211,153,0.15)", border: "1px solid rgba(56,211,153,0.3)", color: "#38D399" }}>
                ?
              </button>
            </div>
          </div>
          <p className="text-xs mt-1" style={{ color: "#555" }}>Crack the 5-letter word in 6 tries</p>

          {/* Streak badge */}
          {dailyStreak > 0 && (
            <div className="flex justify-center mt-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: "rgba(56,145,166,0.15)", border: "1px solid rgba(56,145,166,0.3)", color: "#3891A6" }}>
                🔥 {dailyStreak} day streak
              </span>
            </div>
          )}

          {/* Streak progress */}
          {status === "playing" && nextReward && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => {
                  const dayIdx = i + 1;
                  const filled = dayIdx < streakDay;
                  const current = dayIdx === streakDay;
                  return (
                    <div key={i} className="flex items-center justify-center rounded-sm text-[9px] font-bold"
                         style={{ width: 28, height: 20,
                                  background: filled ? "#38D399" : current ? "rgba(56,145,166,0.3)" : "#1A1A1A",
                                  border: current ? "1px solid #3891A6" : "1px solid #2A2A2A",
                                  color: filled ? "#020202" : current ? "#3891A6" : "#444" }}>
                      {dayIdx}
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px]" style={{ color: "#666" }}>
                Win today: <span style={{ color: "#38D399" }}>+{nextReward.points}pts</span>{" "}
                <span style={{ color: "#3891A6" }}>+{nextReward.xp}xp</span>
              </span>
            </div>
          )}
        </div>

        {/* ── Toast ── */}
        {msg && (
          <div className="mb-3 px-5 py-2 rounded-xl font-bold text-sm pw-fadein"
               style={{ background: "#FFF", color: "#020202", boxShadow: "0 4px 24px rgba(0,0,0,0.6)", zIndex: 10 }}>
            {msg}
          </div>
        )}

        {/* ── Shield notice ── */}
        {shieldNotice && (
          <div className="mb-3 px-5 py-2 rounded-xl font-bold text-sm pw-fadein flex items-center gap-2"
               style={{ background: "rgba(56,145,166,0.15)", border: "1px solid #3891A6", color: "#3891A6" }}>
            🛡️ Streak shield used! Your streak was protected.
            <button onClick={() => setShieldNotice(false)} className="ml-auto text-xs opacity-60 hover:opacity-100">✕</button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 mt-20" style={{ color: "#3891A6" }}>
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading today&apos;s puzzle…</span>
          </div>
        ) : (
          <>
            {/* ── Grid ── */}
            <div ref={boardRef} className="flex flex-col gap-1 mb-5 w-full" style={{ maxWidth: 340 }}>
              {grid.map((row, ri) => {
                const isShaking   = shaking && ri === guesses.length;
                const isRevealing = revealing === ri;
                const isWinRow    = status === "won" && ri === guesses.length - 1;

                return (
                  <div key={ri} className={`flex gap-1 justify-center${isShaking ? " pw-shake" : ""}`}>
                    {row.map((tile, ci) => {
                      const displaySt = (isRevealing && ci >= revealedCols) ? "tbd" : tile.st;
                      const isActive  = ri === guesses.length && status === "playing";
                      const { bg, border, color, glow } = getTileStyle(displaySt, isActive && tile.st === "tbd");
                      const isPop     = isActive && ci === curr.length - 1 && popCol === ci;
                      const revDelay  = isRevealing ? `${ci * 0.12}s` : undefined;
                      const bnDelay   = isWinRow ? `${ci * 0.07}s` : undefined;

                      return (
                        <div key={ci}
                             className={`flex items-center justify-center font-black uppercase select-none rounded-lg${isPop ? " pw-pop" : ""}${isRevealing ? " pw-reveal" : ""}${isWinRow ? " pw-bounce" : ""}`}
                             style={{
                               width: tileSize, height: tileSize,
                               fontSize: Math.round(tileSize * 0.44),
                               background: bg,
                               border: `2px solid ${border}`,
                               boxShadow: glow !== "none" ? `0 0 12px ${glow}` : undefined,
                               color,
                               transition: "background 0.05s, border-color 0.05s",
                               ...(isRevealing && { animationDelay: revDelay }),
                               ...(isWinRow && { animationDelay: bnDelay }),
                             }}>
                          {tile.l}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* ── Game Over panel ── */}
            {status !== "playing" && (
              <div className="w-full max-w-xs mb-5 p-5 rounded-xl text-center pw-fadein"
                   style={{ border: "1px solid rgba(56,211,153,0.2)", background: "rgba(56,211,153,0.04)" }}>
                {status === "won" ? (
                  <>
                    <p className="font-black text-xl mb-1" style={{ color: "#38D399" }}>
                      {WIN_MSGS[Math.min(guesses.length - 1, 5)]}
                    </p>
                    {grade && (
                      <div className="flex items-center justify-center gap-2 mb-3">
                        <span className="text-xs font-bold" style={{ color: "#9ca3af" }}>GRADE</span>
                        <span className="text-3xl font-black" style={{ color: grade.color }}>{grade.grade}</span>
                        <span className="text-xs font-bold" style={{ color: "#9ca3af" }}>{guesses.length}/{MAX_ROWS}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-xs mb-1" style={{ color: "#666" }}>The word was</p>
                    <p className="text-3xl font-black tracking-[0.3em] text-white mb-3">{word}</p>
                  </>
                )}
                <div className="text-center mb-3">
                  <p className="text-xs mb-0.5" style={{ color: "#555" }}>Next puzzle</p>
                  <p className="text-2xl font-mono font-bold" style={{ color: "#FDE74C" }}>{countdown}</p>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8, fontFamily: 'monospace' }}>Share Your Result</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleShareTwitter} title="Share on X" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zM17.083 20.248h1.833L7.084 4.126H5.117z"/></svg>
                    X
                  </button>
                  <button onClick={handleShareFacebook} title="Share on Facebook" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(24,119,242,0.4)', background: 'rgba(24,119,242,0.1)', color: '#5b9cf6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                    Facebook
                  </button>
                  <button onClick={handleShareWhatsApp} title="Share on WhatsApp" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                  <button onClick={handleShareReddit} title="Share on Reddit" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(255,69,0,0.4)', background: 'rgba(255,69,0,0.1)', color: '#f97316', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                    Reddit
                  </button>
                  <button onClick={handleShareTelegram} title="Share on Telegram" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(0,136,204,0.4)', background: 'rgba(0,136,204,0.1)', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram
                  </button>
                  <button onClick={handleShareCopy} title="Copy to clipboard" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: copied ? '1px solid rgba(56,211,153,0.5)' : '1px solid rgba(255,255,255,0.15)', background: copied ? 'rgba(56,211,153,0.15)' : 'rgba(255,255,255,0.04)', color: copied ? '#38D399' : '#9ca3af', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            )}

            {/* ── Keyboard ── */}
            <div className="flex flex-col gap-1.5 w-full" style={{ maxWidth: 380 }}>
              {KB_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1.5">
                  {row.map(key => {
                    const st = keyMap[key];
                    let bg = "rgba(56,145,166,0.18)";
                    let color = "#fff";
                    if (st === "correct") { bg = "#10b981"; color = "#020202"; }
                    else if (st === "present") { bg = "#d97706"; color = "#020202"; }
                    else if (st === "absent")  { bg = "rgba(56,145,166,0.22)"; color = "#374151"; }
                    const wide = key === "ENTER" || key === "⌫";
                    return (
                      <button key={key}
                              onClick={() => {
                                if (key === "ENTER") submit();
                                else if (key === "⌫") del();
                                else type(key);
                              }}
                              className="rounded-lg font-bold hover:opacity-80 active:scale-95 transition-transform select-none"
                              style={{
                                background: bg, color,
                                height:   "clamp(42px, 11vw, 56px)",
                                width:    wide ? "clamp(50px, 13vw, 64px)" : "clamp(28px, 8.5vw, 42px)",
                                fontSize: key === "ENTER" ? "0.58rem" : "0.875rem",
                                flexShrink: 0,
                                border: "1px solid rgba(255,255,255,0.08)",
                              }}>
                        {key}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* ── Skip token button ── */}
            {status === "playing" && skipTokens > 0 && (
              <div className="mt-4 flex justify-center">
                <button onClick={handleSkip} disabled={skipping}
                        className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                        style={{ backgroundColor: "rgba(56,145,166,0.1)", border: "1px solid rgba(56,145,166,0.3)", color: "#3891A6" }}>
                  {skipping ? "Skipping..." : `🎫 Skip today (${skipTokens} token${skipTokens !== 1 ? "s" : ""})`}
                </button>
              </div>
            )}

            {/* ── Stats strip ── */}
            {status !== "playing" && (
              <div className="w-full max-w-xs mt-4 flex justify-center gap-6 pw-fadein">
                {[
                  { label: "Guesses", value: status === "won" ? `${guesses.length}/${MAX_ROWS}` : `X/${MAX_ROWS}` },
                  { label: "Puzzle",  value: `#${dayNum}` },
                ].map(({ label, value }) => (
                  <div key={label} className="text-center">
                    <p className="text-2xl font-black text-white">{value}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{label}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Reward Modal ── */}
      {showRewardModal && earnedReward && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowRewardModal(false)}
        >
          <div
            className="w-full max-w-sm mx-4 rounded-2xl border-2 p-8 text-center pw-modal-in pw-glow"
            style={{ backgroundColor: "rgba(2,2,2,0.97)", borderColor: "#FDE74C" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="text-5xl mb-3 select-none">🏆</div>

            {/* Title */}
            <h2 className="text-2xl font-extrabold text-white mb-1">Daily Complete!</h2>
            <p className="text-sm mb-5" style={{ color: "#DDDBF1" }}>
              {WIN_MSGS[Math.min(guesses.length - 1, 5)]}
            </p>

            {/* Reward counters */}
            <div className="flex justify-center gap-6 mb-5">
              <div className="text-center pw-counter" style={{ animationDelay: "0.15s" }}>
                <span className="text-4xl font-extrabold tabular-nums" style={{ color: "#38D399" }}>
                  +{earnedReward.points}
                </span>
                <p className="text-xs font-bold mt-1" style={{ color: "#38D399" }}>POINTS</p>
              </div>
              <div className="text-center pw-counter" style={{ animationDelay: "0.35s" }}>
                <span className="text-4xl font-extrabold tabular-nums" style={{ color: "#FDE74C" }}>
                  +{earnedReward.xp}
                </span>
                <p className="text-xs font-bold mt-1" style={{ color: "#FFB86B" }}>XP</p>
              </div>
            </div>

            {/* Streak progress */}
            <div className="mb-5 pw-counter" style={{ animationDelay: "0.55s" }}>
              <p className="text-xs font-bold mb-2" style={{ color: "#888" }}>STREAK PROGRESS</p>
              <div className="flex justify-center gap-1.5">
                {Array.from({ length: 7 }, (_, i) => {
                  const dayIdx = i + 1;
                  const filled = dayIdx <= earnedReward.streakDay;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-center rounded text-[10px] font-bold transition-all"
                      style={{
                        width: 32, height: 28,
                        background: filled ? (dayIdx === 7 ? 'linear-gradient(135deg, #FDE74C, #F97316)' : '#38D399') : '#1A1A1A',
                        border: filled ? 'none' : '1px solid #2A2A2A',
                        color: filled ? '#020202' : '#444',
                      }}
                    >
                      {dayIdx === 7 ? '★' : dayIdx}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs mt-2" style={{ color: "#3891A6" }}>
                🔥 Day {earnedReward.streakDay} of 7
              </p>
            </div>

            {/* Come back message */}
            <div className="pw-counter" style={{ animationDelay: "0.7s" }}>
              {earnedReward.streakDay < 7 ? (
                <p className="text-sm" style={{ color: "#AB9F9D" }}>
                  Come back tomorrow to keep your streak alive!
                </p>
              ) : (
                <p className="text-sm font-bold" style={{ color: "#FDE74C" }}>
                  🎉 7-day streak complete! Bonus maxed out!
                </p>
              )}
            </div>

            {/* Share result */}
            <div className="mt-5 pw-counter" style={{ animationDelay: "0.85s" }}>
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  {guesses.map((g, i) => (
                    <div key={i} className="flex justify-center" style={{ gap: 2 }}>
                      {evaluate(g, word).map((s, j) => (
                        <span key={j} style={{ fontSize: 17, lineHeight: 1 }}>
                          {EMOJI[s as keyof typeof EMOJI] ?? "\u2B1B"}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8, fontFamily: 'monospace' }}>Share Your Result</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleShareTwitter} title="Share on X" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631zM17.083 20.248h1.833L7.084 4.126H5.117z"/></svg>
                    X
                  </button>
                  <button onClick={handleShareFacebook} title="Share on Facebook" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(24,119,242,0.4)', background: 'rgba(24,119,242,0.1)', color: '#5b9cf6', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.268h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                    Facebook
                  </button>
                  <button onClick={handleShareWhatsApp} title="Share on WhatsApp" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(37,211,102,0.4)', background: 'rgba(37,211,102,0.1)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </button>
                  <button onClick={handleShareReddit} title="Share on Reddit" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(255,69,0,0.4)', background: 'rgba(255,69,0,0.1)', color: '#f97316', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                    Reddit
                  </button>
                  <button onClick={handleShareTelegram} title="Share on Telegram" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: '1px solid rgba(0,136,204,0.4)', background: 'rgba(0,136,204,0.1)', color: '#38bdf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                    Telegram
                  </button>
                  <button onClick={handleShareCopy} title="Copy to clipboard" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 8, border: copied ? '1px solid rgba(56,211,153,0.5)' : '1px solid rgba(255,255,255,0.15)', background: copied ? 'rgba(56,211,153,0.15)' : 'rgba(255,255,255,0.04)', color: copied ? '#38D399' : '#9ca3af', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                </div>
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setShowRewardModal(false)}
              className="mt-4 px-6 py-2 rounded-xl font-bold text-sm hover:opacity-80 transition-opacity"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#888" }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* ── Season Pass upgrade offer (fires on 3rd win) ───────────────────── */}
      {showUpgradeOffer && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowUpgradeOffer(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 rounded-2xl p-8 text-center"
            style={{
              background: "linear-gradient(135deg, #0a0a0a 0%, #020202 100%)",
              border: "1px solid rgba(253,231,76,0.35)",
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setShowUpgradeOffer(false)}
              className="absolute top-3 right-4 text-xl leading-none opacity-60 hover:opacity-100"
              style={{ color: "#fff" }}
            >
              ×
            </button>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
            <div
              className="font-black text-xl mb-2"
              style={{ color: "#FDE74C", letterSpacing: "0.03em" }}
            >
              You&rsquo;re clearly hooked.
            </div>
            <div className="text-sm mb-6" style={{ color: "#DDDBF1", lineHeight: 1.7 }}>
              3 wins in. Season Pass unlocks premium tier rewards, exclusive cosmetics, and bonus XP — all for $4.99 a season.
            </div>
            <a
              href="/season-pass"
              onClick={() => setShowUpgradeOffer(false)}
              className="block py-3 px-6 rounded-xl font-black text-sm hover:opacity-90 transition-opacity mb-3"
              style={{ background: "#FDE74C", color: "#020202", letterSpacing: "0.05em" }}
            >
              Unlock Season Pass →
            </a>
            <button
              onClick={() => setShowUpgradeOffer(false)}
              className="text-xs hover:opacity-80"
              style={{ color: "#AB9F9D" }}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
