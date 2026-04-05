// Puzzle board skin definitions
// Each skin provides CSS-in-JS tokens used by puzzle components.

export type SkinKey = "default" | "retro" | "minimal" | "neon" | "skin_retro" | "skin_minimal" | "skin_neon";

export interface PuzzleSkinTokens {
  // Board wrapper
  boardBg: string;
  boardBorder: string;
  boardShadow: string;
  boardRadius: string;
  // Tile / cell
  tileBg: string;
  tileBorder: string;
  tileText: string;
  tileFontFamily: string;
  // Accent colours (correct, wrong, active)
  accentCorrect: string;
  accentWrong: string;
  accentActive: string;
  // Input
  inputBg: string;
  inputBorder: string;
  inputText: string;
  // Button (primary action)
  btnBg: string;
  btnText: string;
  // Label / secondary text
  labelColor: string;
}

const DEFAULT: PuzzleSkinTokens = {
  boardBg: "rgba(15,18,25,0.97)",
  boardBorder: "rgba(56,145,166,0.3)",
  boardShadow: "none",
  boardRadius: "1rem",
  tileBg: "rgba(56,145,166,0.12)",
  tileBorder: "rgba(56,145,166,0.35)",
  tileText: "#ffffff",
  tileFontFamily: "inherit",
  accentCorrect: "rgba(74,222,128,0.35)",
  accentWrong: "rgba(248,113,113,0.35)",
  accentActive: "rgba(253,231,76,0.25)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(56,145,166,0.4)",
  inputText: "#ffffff",
  btnBg: "linear-gradient(135deg,#FDE74C,#FFB86B)",
  btnText: "#1a1400",
  labelColor: "#9ca3af",
};

const RETRO: PuzzleSkinTokens = {
  boardBg: "#1a0a00",
  boardBorder: "#c47c00",
  boardShadow: "0 0 0 3px #c47c00, 0 0 16px rgba(196,124,0,0.4)",
  boardRadius: "0px",
  tileBg: "#2a1400",
  tileBorder: "#c47c00",
  tileText: "#ffdd88",
  tileFontFamily: "'Courier New', monospace",
  accentCorrect: "rgba(0,200,80,0.45)",
  accentWrong: "rgba(220,40,40,0.45)",
  accentActive: "rgba(255,200,0,0.35)",
  inputBg: "#2a1400",
  inputBorder: "#c47c00",
  inputText: "#ffdd88",
  btnBg: "#c47c00",
  btnText: "#1a0a00",
  labelColor: "#c47c00",
};

const MINIMAL: PuzzleSkinTokens = {
  boardBg: "#0e0e0e",
  boardBorder: "rgba(255,255,255,0.1)",
  boardShadow: "none",
  boardRadius: "0.5rem",
  tileBg: "rgba(255,255,255,0.04)",
  tileBorder: "rgba(255,255,255,0.12)",
  tileText: "#e5e5e5",
  tileFontFamily: "'Inter', sans-serif",
  accentCorrect: "rgba(255,255,255,0.25)",
  accentWrong: "rgba(180,180,180,0.2)",
  accentActive: "rgba(255,255,255,0.15)",
  inputBg: "rgba(255,255,255,0.05)",
  inputBorder: "rgba(255,255,255,0.15)",
  inputText: "#e5e5e5",
  btnBg: "#ffffff",
  btnText: "#0e0e0e",
  labelColor: "#6b7280",
};

const NEON: PuzzleSkinTokens = {
  boardBg: "#050510",
  boardBorder: "#00f5ff",
  boardShadow: "0 0 18px rgba(0,245,255,0.35), inset 0 0 12px rgba(0,245,255,0.06)",
  boardRadius: "0.75rem",
  tileBg: "rgba(0,245,255,0.07)",
  tileBorder: "rgba(0,245,255,0.4)",
  tileText: "#00f5ff",
  tileFontFamily: "'Courier New', monospace",
  accentCorrect: "rgba(0,255,128,0.45)",
  accentWrong: "rgba(255,0,100,0.45)",
  accentActive: "rgba(180,0,255,0.35)",
  inputBg: "rgba(0,245,255,0.05)",
  inputBorder: "rgba(0,245,255,0.5)",
  inputText: "#00f5ff",
  btnBg: "linear-gradient(135deg,#00f5ff,#b400ff)",
  btnText: "#050510",
  labelColor: "#00c8cc",
};

export const SKIN_TOKENS: Record<SkinKey, PuzzleSkinTokens> = {
  default: DEFAULT,
  retro: RETRO,
  minimal: MINIMAL,
  neon: NEON,
  skin_retro: RETRO,
  skin_minimal: MINIMAL,
  skin_neon: NEON,
};

export function getSkinTokens(key: string | undefined | null): PuzzleSkinTokens {
  return SKIN_TOKENS[(key ?? "default") as SkinKey] ?? DEFAULT;
}
