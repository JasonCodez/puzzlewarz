"use client";

import { useEffect, useState, useCallback } from "react";
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
const WIN_MSGS = ["Genius! 🧠", "Magnificent! 🌟", "Impressive! 💪", "Splendid! ✨", "Great! 🎉", "Phew! 😅"];
const EMOJI = { correct: "🟩", present: "🟨", absent: "⬛" } as const;

type TileState = "correct" | "present" | "absent" | "tbd" | "empty";

// ── Game logic ────────────────────────────────────────────────────────────────
function evaluate(guess: string, target: string): TileState[] {
  const result: TileState[] = Array(WORD_LEN).fill("absent");
  const pool = target.split("");
  // Pass 1 – exact matches
  guess.split("").forEach((c, i) => {
    if (c === pool[i]) { result[i] = "correct"; pool[i] = "#"; }
  });
  // Pass 2 – wrong position
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

// ── Styles ────────────────────────────────────────────────────────────────────
function tileColors(st: TileState): { bg: string; border: string; color: string } {
  if (st === "correct") return { bg: "#38D399", border: "#38D399", color: "#020202" };
  if (st === "present") return { bg: "#FDE74C", border: "#FDE74C", color: "#020202" };
  if (st === "absent")  return { bg: "#252525", border: "#252525", color: "#666" };
  if (st === "tbd")     return { bg: "transparent", border: "#3891A6", color: "#FFF" };
  return { bg: "transparent", border: "#2A2A2A", color: "#FFF" };
}

function keyColors(st?: TileState): { bg: string; color: string } {
  if (st === "correct") return { bg: "#38D399", color: "#020202" };
  if (st === "present") return { bg: "#FDE74C", color: "#020202" };
  if (st === "absent")  return { bg: "#1C1C1C", color: "#555" };
  return { bg: "#3A3A3A", color: "#EEE" };
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
  const [revealing, setRevealing] = useState<number | null>(null); // row index being revealed
  const [revealedCols, setRevealedCols] = useState(0); // how many tiles have finished mid-flip
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

  const dateKey  = new Date().toISOString().slice(0, 10);
  const storeKey = sessionUid ? `pw_daily_${dateKey}_${sessionUid}` : `pw_daily_${dateKey}`;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Reset state when user changes
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
        } catch { /* ignore */ }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // Fetch daily streak + token counts
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
      .catch(() => {/* ignore – not logged in */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeKey]);

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
      setTimeout(() => { setStatus(gs); flash(WIN_MSGS[Math.min(guesses.length, 5)], 3_000); }, WORD_LEN * 120 + 600);
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
  const share = () => {
    const rows = guesses.map(g =>
      evaluate(g, word).map(s => EMOJI[s as keyof typeof EMOJI] ?? "⬛").join("")
    );
    const score = status === "won" ? `${guesses.length}/${MAX_ROWS}` : `X/${MAX_ROWS}`;
    const streakLine = dailyStreak > 0
      ? (status === "won"
        ? `\n🔥 ${dailyStreak}-day streak`
        : `\n😔 Streak broken at ${dailyStreak} days`)
      : "";
    const taunt = status === "won"
      ? "\nThink you can beat it? 👇"
      : "\nI'll get it tomorrow. 💪";
    const text = `⚔️ PuzzleWarz Daily #${dayNum} — ${score}\n\n${rows.join("\n")}${streakLine}${taunt}\nhttps://puzzlewarz.com/daily`;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({ text });
    } else {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2_000);
      });
    }
  };

  // ── Build grid ────────────────────────────────────────────────────────────
  const grid = Array.from({ length: MAX_ROWS }, (_, r): { l: string; st: TileState }[] => {
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ backgroundColor: "#020202", minHeight: "100vh" }}>
      <Navbar />

      {/* Animations */}
      <style>{`
        @keyframes pw-shake {
          0%,100%{transform:translateX(0)}
          15%{transform:translateX(-8px)}
          30%{transform:translateX(8px)}
          45%{transform:translateX(-5px)}
          60%{transform:translateX(5px)}
          75%{transform:translateX(-3px)}
          90%{transform:translateX(3px)}
        }
        @keyframes pw-pop {
          0%,100%{transform:scale(1)}
          50%{transform:scale(1.12)}
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
          0%,100%{transform:translateY(0)}
          33%{transform:translateY(-18px)}
          66%{transform:translateY(-8px)}
        }
        .pw-shake { animation: pw-shake 0.6s ease; }
        .pw-pop   { animation: pw-pop 0.12s ease; }
        .pw-fadein{ animation: pw-fadein 0.25s ease; }
        .pw-bounce{ animation: pw-bounce 0.7s ease; }
        @keyframes pw-modal-in {
          from{opacity:0;transform:scale(0.82)}
          to{opacity:1;transform:scale(1)}
        }
        @keyframes pw-counter {
          from{opacity:0;transform:translateY(12px)}
          to{opacity:1;transform:translateY(0)}
        }
        @keyframes pw-glow {
          0%,100%{box-shadow:0 0 20px rgba(253,231,76,0.15)}
          50%{box-shadow:0 0 40px rgba(253,231,76,0.35)}
        }
        .pw-modal-in{ animation: pw-modal-in 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .pw-counter{ animation: pw-counter 0.5s ease both; }
        .pw-glow{ animation: pw-glow 2s ease-in-out infinite; }
      `}</style>

      <main className="pt-24 pb-16 flex flex-col items-center px-2">

        {/* ── Header ── */}
        <div className="w-full max-w-xs mt-6 mb-5 text-center pb-4"
             style={{ borderBottom: "1px solid #1C1C1C" }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold tracking-widest" style={{ color: "#3891A6" }}>PUZZLE WARZ</span>
            <span className="text-xs font-mono" style={{ color: "#444" }}>#{dayNum}</span>
          </div>
          <h1 className="text-3xl font-black tracking-[0.25em] text-white">DAILY</h1>
          <p className="text-xs mt-1.5" style={{ color: "#555" }}>
            Guess the 5-letter word in 6 tries
          </p>
          {/* Streak badge */}
          {dailyStreak > 0 && (
            <div className="flex justify-center mt-2">
              <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(56,145,166,0.15)', border: '1px solid rgba(56,145,166,0.3)', color: '#3891A6' }}>
                🔥 {dailyStreak} day streak
              </span>
            </div>
          )}

          {/* ── Streak progress (7-day cycle) ── */}
          {status === "playing" && nextReward && (
            <div className="mt-3 flex flex-col items-center gap-1.5">
              <div className="flex gap-1">
                {Array.from({ length: 7 }, (_, i) => {
                  const dayIdx = i + 1;
                  const filled = dayIdx < streakDay;
                  const current = dayIdx === streakDay;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-center rounded-sm text-[9px] font-bold"
                      style={{
                        width: 28, height: 20,
                        background: filled ? '#38D399' : current ? 'rgba(56,145,166,0.3)' : '#1A1A1A',
                        border: current ? '1px solid #3891A6' : '1px solid #2A2A2A',
                        color: filled ? '#020202' : current ? '#3891A6' : '#444',
                      }}
                    >
                      {dayIdx}
                    </div>
                  );
                })}
              </div>
              <span className="text-[10px]" style={{ color: '#666' }}>
                Win today: <span style={{ color: '#38D399' }}>+{nextReward.points}pts</span>{' '}
                <span style={{ color: '#3891A6' }}>+{nextReward.xp}xp</span>
              </span>
            </div>
          )}

          {/* ── Color legend ── */}
          <div className="flex justify-center gap-4 mt-3">
            {([
              { bg: "#38D399", label: "Correct spot" },
              { bg: "#FDE74C", label: "Wrong spot" },
              { bg: "#252525", label: "Not in word" },
            ] as const).map(({ bg, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, background: bg, flexShrink: 0 }} />
                <span className="text-xs" style={{ color: "#888" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Message toast ── */}
        {msg && (
          <div className="mb-3 px-5 py-2 rounded-xl font-bold text-sm text-black pw-fadein"
               style={{ background: "#FFF", boxShadow: "0 4px 24px rgba(0,0,0,0.6)", zIndex: 10 }}>
            {msg}
          </div>
        )}

        {/* ── Shield notice ── */}
        {shieldNotice && (
          <div className="mb-3 px-5 py-2 rounded-xl font-bold text-sm pw-fadein flex items-center gap-2"
               style={{ background: 'rgba(56,145,166,0.15)', border: '1px solid #3891A6', color: '#3891A6' }}>
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
            <div className="flex flex-col gap-1.5 mb-5">
              {grid.map((row, ri) => {
                const isShaking   = shaking && ri === guesses.length;
                const isRevealing = revealing === ri;
                const isWinRow    = status === "won" && ri === guesses.length - 1;

                return (
                  <div
                    key={ri}
                    className={`flex gap-1.5${isShaking ? " pw-shake" : ""}`}
                  >
                    {row.map((tile, ci) => {
                      // During reveal, keep tiles as 'tbd' until their flip midpoint
                      const displaySt = (isRevealing && ci >= revealedCols) ? "tbd" : tile.st;
                      const { bg, border, color } = tileColors(displaySt);
                      const isCurrTile = ri === guesses.length && ci === curr.length - 1 && status === "playing";
                      const revDelay   = isRevealing ? `${ci * 0.12}s` : undefined;
                      const bounceDelay = isWinRow ? `${ci * 0.07}s` : undefined;

                      return (
                        <div
                          key={ci}
                          className={`flex items-center justify-center font-black uppercase select-none${isCurrTile ? " pw-pop" : ""}${isRevealing ? " pw-reveal" : ""}${isWinRow && status === "won" ? " pw-bounce" : ""}`}
                          style={{
                            width:  "clamp(48px, 13vw, 62px)",
                            height: "clamp(48px, 13vw, 62px)",
                            fontSize: "clamp(1.1rem, 4vw, 1.5rem)",
                            background:   bg,
                            border:       `2px solid ${border}`,
                            color,
                            borderRadius: 4,
                            ...(isRevealing && { animationDelay: revDelay }),
                            ...(isWinRow    && { animationDelay: bounceDelay }),
                          }}
                        >
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
                   style={{ border: "1px solid rgba(56,145,166,0.2)", background: "rgba(56,145,166,0.06)" }}>
                {status === "won" ? (
                  <p className="font-black text-xl mb-3" style={{ color: "#38D399" }}>
                    {WIN_MSGS[Math.min(guesses.length - 1, 5)]}
                  </p>
                ) : (
                  <>
                    <p className="text-xs mb-1" style={{ color: "#666" }}>The word was</p>
                    <p className="text-3xl font-black tracking-[0.3em] text-white mb-3">{word}</p>
                  </>
                )}

                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-xs mb-0.5" style={{ color: "#555" }}>Next puzzle</p>
                    <p className="text-2xl font-mono font-bold" style={{ color: "#FDE74C" }}>{countdown}</p>
                  </div>
                  <button
                    onClick={share}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm hover:opacity-80 transition-opacity"
                    style={{ background: "#38D399", color: "#020202" }}
                  >
                    {copied ? "Copied ✓" : "Share 🔗"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Keyboard ── */}
            <div className="flex flex-col gap-1.5 w-full" style={{ maxWidth: 360 }}>
              {KB_ROWS.map((row, ri) => (
                <div key={ri} className="flex justify-center gap-1">
                  {row.map(key => {
                    const { bg, color } = keyColors(keyMap[key]);
                    const wide = key === "ENTER" || key === "⌫";
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          if (key === "ENTER")  submit();
                          else if (key === "⌫") del();
                          else                  type(key);
                        }}
                        className="rounded font-bold hover:opacity-80 active:scale-95 transition-transform select-none"
                        style={{
                          background: bg,
                          color,
                          height:   "clamp(44px, 12vw, 58px)",
                          width:    wide ? "clamp(52px, 14vw, 66px)" : "clamp(28px, 8.5vw, 43px)",
                          fontSize: key === "ENTER" ? "0.6rem" : "0.875rem",
                          flexShrink: 0,
                        }}
                      >
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
                <button
                  onClick={handleSkip}
                  disabled={skipping}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ backgroundColor: 'rgba(56,145,166,0.1)', border: '1px solid rgba(56,145,166,0.3)', color: '#3891A6' }}
                >
                  {skipping ? "Skipping..." : `🎫 Skip today (${skipTokens} token${skipTokens !== 1 ? "s" : ""})`}
                </button>
              </div>
            )}

            {/* ── Stats strip (past attempts) ── */}
            {status !== "playing" && (
              <div className="w-full max-w-xs mt-5 flex justify-center gap-6 pw-fadein">
                {[
                  { label: "Guesses", value: status === "won" ? `${guesses.length}/${MAX_ROWS}` : `X/${MAX_ROWS}` },
                  { label: "Puzzle", value: `#${dayNum}` },
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

            {/* Dismiss */}
            <button
              onClick={() => setShowRewardModal(false)}
              className="mt-6 px-6 py-2.5 rounded-xl font-bold text-sm hover:opacity-80 transition-opacity"
              style={{ background: "#38D399", color: "#020202" }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
