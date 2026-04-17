"use client";

import ProgressBar from "@/components/puzzle/ProgressBar";
import AttemptStats from "@/components/puzzle/AttemptStats";
import TimeTracker from "@/components/puzzle/TimeTracker";
import CompletionPercentage from "@/components/puzzle/CompletionPercentage";

interface SessionLog {
  id: string;
  sessionStart: Date | string;
  sessionEnd: Date | string | null;
  durationSeconds: number | null;
  hintUsed: boolean;
  attemptMade: boolean;
  wasSuccessful: boolean;
}

interface PartProgress {
  id: string;
  puzzlePartId: string;
  solved: boolean;
  solvedAt: Date | string | null;
  attempts: number;
  pointsEarned: number;
  part: {
    id: string;
    title: string;
    description: string | null;
    order: number;
    pointsValue: number;
  };
}

interface ProgressForSection {
  solved: boolean;
  completionPercentage: number;
  attempts: number;
  successfulAttempts: number;
  averageTimePerAttempt: number | null;
  totalTimeSpent: number;
  currentSessionStart: Date | string | null;
  sessionLogs: SessionLog[];
  partProgress: PartProgress[];
}

interface PuzzleProgressSectionProps {
  progress: ProgressForSection | null;
  puzzleTitle?: string;
  showProgress: boolean;
  onToggleProgress: () => void;
  effectiveSkipTokens: number;
  isSkipping: boolean;
  onSkip: () => void;
  teamIdParam?: string;
  puzzleType?: string;
}

export function PuzzleProgressSection({
  progress,
  puzzleTitle,
  showProgress,
  onToggleProgress,
  effectiveSkipTokens,
  isSkipping,
  onSkip,
  teamIdParam,
  puzzleType,
}: PuzzleProgressSectionProps) {
  return (
    <div
      style={
        puzzleType === 'sudoku'
          ? undefined
          : { borderTopColor: "#3891A6", borderTopWidth: "1px", paddingTop: "2rem" }
      }
    >
      {/* Skip Token Button */}
      {!progress?.solved && !teamIdParam && (
        <div className="mb-6 flex flex-col items-center gap-2">
          {effectiveSkipTokens > 0 ? (
            <button
              onClick={onSkip}
              disabled={isSkipping}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-40"
              style={{
                backgroundColor: "rgba(139,92,246,0.15)",
                border: "1px solid rgba(139,92,246,0.4)",
                color: "#a78bfa",
              }}
            >
              {isSkipping
                ? "Skipping…"
                : `⏭️ Skip Puzzle (${effectiveSkipTokens} token${effectiveSkipTokens !== 1 ? "s" : ""})`}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-1">
              <button
                disabled
                className="px-5 py-2.5 rounded-xl font-semibold text-sm opacity-40 cursor-not-allowed"
                style={{
                  backgroundColor: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  color: "#a78bfa",
                }}
              >
                ⏭️ Skip Puzzle — No Tokens
              </button>
              <a
                href="/store"
                className="text-xs font-semibold underline transition-opacity hover:opacity-80"
                style={{ color: "#FDE74C" }}
              >
                Buy skip tokens →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Progress Section (multi-part puzzles only) */}
      {progress && showProgress && progress.partProgress && progress.partProgress.length > 1 && (
        <div className="mb-8 space-y-4">
          <h2 className="text-xl font-semibold text-white">📊 Your Progress</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-3">
              <ProgressBar
                percentage={progress.completionPercentage}
                solved={progress.solved}
                showPercentage={true}
                animateOnLoad={true}
              />
            </div>
            <div className="lg:col-span-1">
              <AttemptStats
                attempts={progress.attempts}
                successfulAttempts={progress.successfulAttempts}
                averageTimePerAttempt={progress.averageTimePerAttempt}
                totalAttempts={100}
              />
            </div>
            <div className="lg:col-span-1">
              <TimeTracker
                totalTimeSpent={progress.totalTimeSpent}
                currentSessionStart={progress.currentSessionStart}
                sessionLogs={progress.sessionLogs}
                isActive={!progress.solved}
              />
            </div>
            {progress.partProgress.length > 0 && (
              <div className="lg:col-span-1">
                <CompletionPercentage
                  parts={progress.partProgress.map((p) => ({
                    id: p.id,
                    title: p.part.title,
                    description: p.part.description,
                    order: p.part.order,
                    pointsValue: p.part.pointsValue,
                    solved: p.solved,
                    solvedAt: p.solvedAt,
                  }))}
                  overallPercentage={progress.completionPercentage}
                  isMultiPart={progress.partProgress.length > 1}
                  puzzleTitle={puzzleTitle}
                />
              </div>
            )}
          </div>
          <div className="text-right">
            <button
              onClick={onToggleProgress}
              className="text-sm px-3 py-1 rounded-lg transition-colors hover:opacity-80"
              style={{ backgroundColor: "rgba(171, 159, 157, 0.1)", color: "#AB9F9D" }}
            >
              {showProgress ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
