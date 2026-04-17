"use client";

import { useRouter } from "next/navigation";

interface PuzzlePageOverlaysProps {
  timeLimitExceeded: boolean;
  maxAttemptsExceeded: boolean;
  showGiveUpConfirm: boolean;
  sudokuTimeLimitMinutes: number;
  onGoToPuzzles: () => void;
  onGiveUpConfirm: () => void;
  onGiveUpCancel: () => void;
}

export function PuzzlePageOverlays({
  timeLimitExceeded,
  maxAttemptsExceeded,
  showGiveUpConfirm,
  onGoToPuzzles,
  onGiveUpConfirm,
  onGiveUpCancel,
}: PuzzlePageOverlaysProps) {
  return (
    <>
      {timeLimitExceeded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-md w-full bg-gradient-to-br from-[#071016] to-[#09313a] text-white rounded-xl p-6 shadow-2xl border border-[#FDE74C]/20">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#FDE74C] to-[#FFB86B] flex items-center justify-center shadow-lg">
                <span className="text-3xl">⏱️</span>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-2xl font-extrabold text-yellow-300">Oh No! Time Limit Reached</h2>
                <p className="mt-1 text-sm text-gray-200">Puzzle failed. Try another puzzle — you'll get it next time!</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-[#cbd5e1]">You will be redirected to the puzzles page shortly.</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGoToPuzzles}
                  className="px-4 py-2 rounded bg-yellow-300 text-black font-semibold shadow hover:brightness-95 transition"
                >
                  Go to puzzles now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {maxAttemptsExceeded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-md w-full bg-gradient-to-br from-[#071016] to-[#09313a] text-white rounded-xl p-6 shadow-2xl border border-[#FDE74C]/20">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#FDE74C] to-[#FFB86B] flex items-center justify-center shadow-lg">
                <span className="text-3xl">🔒</span>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-2xl font-extrabold text-yellow-300">Oh No! Max Submissions Reached</h2>
                <p className="mt-1 text-sm text-gray-200">Puzzle failed due to too many incorrect submissions. Try another puzzle!</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-[#cbd5e1]">You will be redirected to the puzzles page shortly.</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGoToPuzzles}
                  className="px-4 py-2 rounded bg-yellow-300 text-black font-semibold shadow hover:brightness-95 transition"
                >
                  Go to puzzles now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGiveUpConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-md w-full bg-gradient-to-br from-[#071016] to-[#09313a] text-white rounded-xl p-6 shadow-2xl border border-[#FDE74C]/20">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#FDE74C] to-[#FFB86B] flex items-center justify-center shadow-lg">
                <span className="text-3xl">❗</span>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-2xl font-extrabold text-yellow-300">Give Up?</h2>
                <p className="mt-1 text-sm text-gray-200">Giving up will mark this puzzle as failed and you will not be able to access it again. Are you sure?</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="text-xs text-[#cbd5e1]">This action is permanent for this puzzle.</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={onGiveUpConfirm}
                  className="px-4 py-2 rounded bg-yellow-300 text-black font-semibold shadow hover:brightness-95 transition"
                >
                  Give Up
                </button>
                <button
                  onClick={onGiveUpCancel}
                  className="px-3 py-2 rounded bg-transparent border border-white/10 text-sm text-white/90 hover:bg-white/5 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
