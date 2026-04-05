"use client";

import { useState, useCallback, useRef } from "react";
import { usePuzzleSkin } from "@/hooks/usePuzzleSkin";

// ─── Types ──────────────────────────────────────────────────────────────────

type StageType = "cipher" | "image" | "url" | "riddle" | "pattern";

type CipherType = "base64" | "rot13" | "morse" | "vigenere" | "binary" | "hex" | "reverse";

interface ArgStage {
  id: number;
  type: StageType;
  title?: string;
  description: string;
  // cipher
  cipherType?: CipherType;
  cipherText?: string;
  vigenereKey?: string;
  // image
  imageUrl?: string;
  imageCaption?: string;
  // url
  url?: string;
  urlLabel?: string;
  // riddle
  riddle?: string;
  // pattern
  pattern?: string;
  patternLabel?: string;
  // answer & nudge
  answer: string;
  nudgeAfter?: number; // wrong attempts before showing nudge
  nudgeText?: string;
}

interface ArgData {
  lore?: string;
  stages: ArgStage[];
  finalMessage?: string;
}

interface Props {
  puzzleId: string;
  argData: Record<string, unknown>;
  alreadySolved?: boolean;
  onSolved?: () => void;
}

// ─── Cipher decoders (client-side reference tool) ───────────────────────────

function decodeBase64(s: string): string {
  try { return atob(s.trim()); } catch { return "Invalid Base64"; }
}
function decodeRot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}
const MORSE_MAP: Record<string, string> = {
  ".-": "A", "-...": "B", "-.-.": "C", "-..": "D", ".": "E", "..-.": "F",
  "--.": "G", "....": "H", "..": "I", ".---": "J", "-.-": "K", ".-..": "L",
  "--": "M", "-.": "N", "---": "O", ".--.": "P", "--.-": "Q", ".-.": "R",
  "...": "S", "-": "T", "..-": "U", "...-": "V", ".--": "W", "-..-": "X",
  "-.--": "Y", "--..": "Z", "-----": "0", ".----": "1", "..---": "2",
  "...--": "3", "....-": "4", ".....": "5", "-....": "6", "--...": "7",
  "---..": "8", "----.": "9", "/": " ",
};
function decodeMorse(s: string): string {
  return s.trim().split("  ").map(word =>
    word.trim().split(" ").map(tok => MORSE_MAP[tok] ?? "?").join("")
  ).join(" ");
}
function decodeVigenere(cipherText: string, key: string): string {
  if (!key) return cipherText;
  const k = key.toUpperCase();
  let ki = 0;
  return cipherText.toUpperCase().replace(/[A-Z]/g, (c) => {
    const decoded = String.fromCharCode(((c.charCodeAt(0) - 65 - (k.charCodeAt(ki % k.length) - 65) + 26) % 26) + 65);
    ki++;
    return decoded;
  });
}
function decodeBinary(s: string): string {
  try {
    return s.trim().split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join("");
  } catch { return "Invalid binary"; }
}
function decodeHex(s: string): string {
  try {
    return s.trim().split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join("");
  } catch { return "Invalid hex"; }
}
function decodeReverse(s: string): string { return s.split("").reverse().join(""); }

function getCipherDecoded(stage: ArgStage): string {
  const text = stage.cipherText ?? "";
  switch (stage.cipherType) {
    case "base64":  return decodeBase64(text);
    case "rot13":   return decodeRot13(text);
    case "morse":   return decodeMorse(text);
    case "vigenere": return decodeVigenere(text, stage.vigenereKey ?? "");
    case "binary":  return decodeBinary(text);
    case "hex":     return decodeHex(text);
    case "reverse": return decodeReverse(text);
    default:        return text;
  }
}

const CIPHER_LABELS: Record<CipherType, string> = {
  base64: "Base64",
  rot13: "ROT-13",
  morse: "Morse Code",
  vigenere: "Vigenère",
  binary: "Binary",
  hex: "Hexadecimal",
  reverse: "Reversed",
};

// ─── Stage renderers ─────────────────────────────────────────────────────────

function CipherStage({ stage, skin }: { stage: ArgStage; skin: ReturnType<typeof usePuzzleSkin> }) {
  const [showDecoded, setShowDecoded] = useState(false);
  const decoded = getCipherDecoded(stage);
  return (
    <div className="space-y-4">
      {stage.description && (
        <p className="text-gray-300 text-sm leading-relaxed">{stage.description}</p>
      )}
      <div className="rounded-xl p-4" style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${skin.tileBorder}` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: skin.labelColor }}>
            {stage.cipherType ? CIPHER_LABELS[stage.cipherType] : "Encoded Message"}
          </span>
          <button
            onClick={() => setShowDecoded(!showDecoded)}
            className="text-xs px-3 py-1 rounded-lg font-semibold transition-all hover:brightness-110"
            style={{ background: skin.tileBg, color: skin.tileText, border: `1px solid ${skin.tileBorder}` }}
          >
            {showDecoded ? "Hide Decoder" : "🔓 Decode"}
          </button>
        </div>
        <pre className="text-sm font-mono break-all whitespace-pre-wrap" style={{ color: skin.tileText, fontFamily: "'Courier New', monospace" }}>
          {stage.cipherText}
        </pre>
      </div>
      {showDecoded && (
        <div className="rounded-xl p-4" style={{ background: "rgba(56,211,153,0.07)", border: "1px solid rgba(56,211,153,0.3)" }}>
          <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ color: "#4ade80" }}>Decoded Output</p>
          <pre className="text-sm font-mono break-all whitespace-pre-wrap text-white">
            {decoded}
          </pre>
          <p className="text-xs mt-2" style={{ color: "#6b7280" }}>
            This is the raw decoded text — the answer may still need interpretation.
          </p>
        </div>
      )}
    </div>
  );
}

function ImageStage({ stage, skin }: { stage: ArgStage; skin: ReturnType<typeof usePuzzleSkin> }) {
  return (
    <div className="space-y-4">
      {stage.description && (
        <p className="text-gray-300 text-sm leading-relaxed">{stage.description}</p>
      )}
      {stage.imageUrl && (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${skin.tileBorder}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={stage.imageUrl} alt="ARG clue image" className="w-full object-contain max-h-96" />
          {stage.imageCaption && (
            <div className="px-4 py-2 text-xs italic text-center" style={{ color: skin.labelColor, background: "rgba(0,0,0,0.4)" }}>
              {stage.imageCaption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function UrlStage({ stage, skin }: { stage: ArgStage; skin: ReturnType<typeof usePuzzleSkin> }) {
  return (
    <div className="space-y-4">
      {stage.description && (
        <p className="text-gray-300 text-sm leading-relaxed">{stage.description}</p>
      )}
      {stage.url && (
        <a
          href={stage.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-xl px-5 py-4 font-semibold text-sm transition-all hover:brightness-110"
          style={{ background: skin.tileBg, border: `1px solid ${skin.tileBorder}`, color: skin.tileText }}
        >
          <span className="text-xl">🌐</span>
          <span>{stage.urlLabel || stage.url}</span>
          <span className="ml-auto text-xs opacity-60">↗ opens in new tab</span>
        </a>
      )}
    </div>
  );
}

function RiddleStage({ stage }: { stage: ArgStage }) {
  return (
    <div className="space-y-4">
      {stage.description && (
        <p className="text-gray-300 text-sm leading-relaxed">{stage.description}</p>
      )}
      {stage.riddle && (
        <blockquote className="rounded-xl px-6 py-5 text-base italic leading-relaxed text-white"
          style={{ background: "rgba(253,231,76,0.06)", borderLeft: "4px solid #FDE74C" }}>
          "{stage.riddle}"
        </blockquote>
      )}
    </div>
  );
}

function PatternStage({ stage, skin }: { stage: ArgStage; skin: ReturnType<typeof usePuzzleSkin> }) {
  return (
    <div className="space-y-4">
      {stage.description && (
        <p className="text-gray-300 text-sm leading-relaxed">{stage.description}</p>
      )}
      {stage.patternLabel && (
        <p className="text-xs uppercase tracking-widest font-semibold" style={{ color: skin.labelColor }}>
          {stage.patternLabel}
        </p>
      )}
      {stage.pattern && (
        <div className="rounded-xl px-6 py-5 text-center"
          style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${skin.boardBorder}` }}>
          <p className="text-2xl font-black font-mono tracking-widest text-white">{stage.pattern}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function ArgPuzzle({ puzzleId, argData: rawArgData, alreadySolved = false, onSolved }: Props) {
  const skin = usePuzzleSkin();

  const argData = rawArgData as unknown as ArgData;
  const stages: ArgStage[] = Array.isArray(argData.stages) ? argData.stages : [];

  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [input, setInput] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [stageError, setStageError] = useState("");
  const [stageSuccess, setStageSuccess] = useState(false);
  const [completedStages, setCompletedStages] = useState<number[]>(alreadySolved ? stages.map((_, i) => i) : []);
  const [allDone, setAllDone] = useState(alreadySolved);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentStage: ArgStage | undefined = stages[currentStageIdx];
  const totalStages = stages.length;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStage || submitting) return;

    const guess = input.trim().toUpperCase().replace(/\s+/g, " ");
    const expected = currentStage.answer.trim().toUpperCase().replace(/\s+/g, " ");

    if (guess !== expected) {
      const newWrong = wrongAttempts + 1;
      setWrongAttempts(newWrong);
      setStageError("❌ That's not quite right. Keep hunting…");
      setTimeout(() => setStageError(""), 2500);
      return;
    }

    // Correct!
    setStageSuccess(true);
    const newCompleted = [...completedStages, currentStageIdx];
    setCompletedStages(newCompleted);

    if (currentStageIdx < totalStages - 1) {
      setTimeout(() => {
        setCurrentStageIdx(currentStageIdx + 1);
        setInput("");
        setWrongAttempts(0);
        setStageError("");
        setStageSuccess(false);
        inputRef.current?.focus();
      }, 1200);
    } else {
      // All stages complete — fire solved
      setAllDone(true);
      setSubmitting(true);
      try {
        await fetch(`/api/puzzles/${puzzleId}/progress`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "attempt_success" }),
        });
        onSolved?.();
      } catch { /* ignore */ } finally {
        setSubmitting(false);
      }
    }
  }, [currentStage, input, wrongAttempts, completedStages, currentStageIdx, totalStages, puzzleId, onSolved, submitting]);

  // Guard: no stages
  if (stages.length === 0) {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(15,18,25,0.97)", border: "1px solid rgba(248,113,113,0.3)" }}>
        <p className="text-red-400 font-semibold">⚠️ This ARG puzzle has no stages configured yet.</p>
      </div>
    );
  }

  // All done screen
  if (allDone) {
    return (
      <div className="rounded-2xl p-8 flex flex-col items-center gap-5 text-center"
        style={{ background: skin.boardBg, border: `1px solid rgba(56,211,153,0.5)`, borderRadius: skin.boardRadius }}>
        <div className="text-5xl">🕵️‍♂️✅</div>
        <h2 className="text-2xl font-extrabold text-white">You cracked the ARG!</h2>
        <p className="text-gray-300 max-w-sm text-sm">
          {argData.finalMessage || "Impressive. You dug deeper than most."}
        </p>
        <div className="flex gap-2 flex-wrap justify-center">
          {stages.map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full" style={{ background: "#4ade80" }} />
          ))}
        </div>
      </div>
    );
  }

  const showNudge = currentStage &&
    typeof currentStage.nudgeAfter === "number" &&
    wrongAttempts >= currentStage.nudgeAfter &&
    !!currentStage.nudgeText;

  return (
    <div className="rounded-2xl p-6 flex flex-col gap-5"
      style={{ background: skin.boardBg, border: `1px solid ${skin.boardBorder}`, borderRadius: skin.boardRadius }}>

      {/* Lore intro — only on stage 0 */}
      {currentStageIdx === 0 && argData.lore && (
        <div className="rounded-xl px-5 py-4 text-sm leading-relaxed italic text-gray-300"
          style={{ background: "rgba(0,0,0,0.3)", borderLeft: `3px solid ${skin.boardBorder}` }}>
          {argData.lore}
        </div>
      )}

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold" style={{ color: skin.labelColor }}>
          Stage {currentStageIdx + 1} / {totalStages}
        </span>
        <div className="flex-1 flex gap-1.5">
          {stages.map((_, i) => (
            <div
              key={i}
              className="flex-1 h-1.5 rounded-full transition-all duration-500"
              style={{
                background: completedStages.includes(i)
                  ? "#4ade80"
                  : i === currentStageIdx
                  ? skin.boardBorder
                  : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Stage title */}
      <div>
        <h3 className="text-lg font-extrabold text-white">
          {currentStage?.title || `Stage ${currentStageIdx + 1}`}
        </h3>
      </div>

      {/* Stage-specific content */}
      {currentStage?.type === "cipher" && <CipherStage stage={currentStage} skin={skin} />}
      {currentStage?.type === "image" && <ImageStage stage={currentStage} skin={skin} />}
      {currentStage?.type === "url" && <UrlStage stage={currentStage} skin={skin} />}
      {currentStage?.type === "riddle" && <RiddleStage stage={currentStage} />}
      {currentStage?.type === "pattern" && <PatternStage stage={currentStage} skin={skin} />}

      {/* Nudge hint */}
      {showNudge && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(253,231,76,0.07)", border: "1px solid rgba(253,231,76,0.25)", color: "#FDE74C" }}>
          🕯️ {currentStage.nudgeText}
        </div>
      )}

      {/* Answer input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="text-xs uppercase tracking-widest font-semibold" style={{ color: skin.labelColor }}>
          Your Answer
        </label>
        {stageSuccess ? (
          <div className="rounded-xl px-5 py-4 text-center font-bold text-lg"
            style={{ background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80" }}>
            ✓ Correct — moving to next stage…
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Enter the answer…"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 px-4 py-3 rounded-xl font-mono text-sm tracking-wide outline-none focus:ring-2"
                style={{
                  background: skin.inputBg,
                  border: `1px solid ${stageError ? "rgba(248,113,113,0.6)" : skin.inputBorder}`,
                  color: skin.inputText,
                }}
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-xl font-bold text-sm transition-transform hover:scale-105 active:scale-95"
                style={{ background: skin.btnBg, color: skin.btnText }}
              >
                ✓
              </button>
            </div>
            {stageError && (
              <p className="text-sm font-semibold" style={{ color: "#f87171" }}>{stageError}</p>
            )}
          </>
        )}
        <p className="text-xs" style={{ color: skin.labelColor }}>
          Answers are case-insensitive. Extra spaces are ignored.
        </p>
      </form>
    </div>
  );
}
