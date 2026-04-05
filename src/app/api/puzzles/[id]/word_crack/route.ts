import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuthenticatedUser } from "@/lib/requireAuthenticatedUser";
import { validateSameOrigin } from "@/lib/requestSecurity";
import { calcLevel } from "@/lib/levels";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const sameOriginError = validateSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const currentUser = await requireAuthenticatedUser();
    if (currentUser instanceof NextResponse) return currentUser;

    const { id: puzzleId } = await context.params;
    const body = await request.json();
    const { guess, warzMode } = body as { guess: string; warzMode?: boolean };

    if (!guess || typeof guess !== "string") {
      return NextResponse.json({ error: "No guess provided" }, { status: 400 });
    }

    const puzzle = await prisma.puzzle.findUnique({
      where: { id: puzzleId },
      select: { data: true, puzzleType: true, xpReward: true, solutions: { select: { points: true }, take: 1 } },
    });

    if (!puzzle || puzzle.puzzleType !== "word_crack") {
      return NextResponse.json({ error: "Puzzle not found" }, { status: 404 });
    }

    const wordleData = (puzzle.data ?? {}) as Record<string, unknown>;
    const word = String(wordleData.word ?? "").toUpperCase().trim();

    if (!word) {
      return NextResponse.json(
        { error: "No word configured for this puzzle" },
        { status: 400 }
      );
    }

    const cleanGuess = guess.toUpperCase().trim();

    if (cleanGuess.length !== word.length) {
      return NextResponse.json(
        { error: `Guess must be ${word.length} letters` },
        { status: 400 }
      );
    }

    // Reject guesses that contain non-alpha characters
    if (!/^[A-Z]+$/.test(cleanGuess)) {
      return NextResponse.json(
        { error: "Guess must contain only letters" },
        { status: 400 }
      );
    }

    // ── Wordle scoring ──────────────────────────────────────────────────────
    const wordArr = word.split("");
    const guessArr = cleanGuess.split("");

    type LetterStatus = "correct" | "present" | "absent";
    const result: { letter: string; status: LetterStatus }[] = guessArr.map(
      (letter) => ({ letter, status: "absent" as LetterStatus })
    );

    const usedWord: boolean[] = Array(word.length).fill(false);
    const usedGuess: boolean[] = Array(word.length).fill(false);

    // Pass 1 – exact position matches (green)
    for (let i = 0; i < word.length; i++) {
      if (guessArr[i] === wordArr[i]) {
        result[i].status = "correct";
        usedWord[i] = true;
        usedGuess[i] = true;
      }
    }

    // Pass 2 – present but wrong position (yellow)
    for (let i = 0; i < word.length; i++) {
      if (usedGuess[i]) continue;
      for (let j = 0; j < word.length; j++) {
        if (usedWord[j]) continue;
        if (guessArr[i] === wordArr[j]) {
          result[i].status = "present";
          usedWord[j] = true;
          break;
        }
      }
    }

    const solved = result.every((r) => r.status === "correct");

    // ── Persist progress ─────────────────────────────────────────────────
    if (!warzMode) try {
      const now = new Date();

      // Upsert the progress record: increment attempts each guess, mark solved when correct.
      let progress = await prisma.userPuzzleProgress.findUnique({
        where: { userId_puzzleId: { userId: currentUser.id, puzzleId } },
      });

      if (!progress) {
        progress = await prisma.userPuzzleProgress.create({
          data: { userId: currentUser.id, puzzleId },
        });
      }

      // Prevent overwriting an already-solved record.
      if (!progress.solved) {
        await prisma.userPuzzleProgress.update({
          where: { id: progress.id },
          data: {
            attempts: { increment: 1 },
            lastAttemptAt: now,
            ...(solved && {
              solved: true,
              solvedAt: now,
              successfulAttempts: { increment: 1 },
            }),
          },
        });

        if (solved) {
          // Award points
          const awardPoints = puzzle.solutions?.[0]?.points ?? 100;
          await prisma.userPuzzleProgress.update({
            where: { id: progress.id },
            data: { pointsEarned: { increment: awardPoints } },
          });

          // Persist to user (survives puzzle deletion) and leaderboard
          await prisma.user.update({
            where: { id: currentUser.id },
            data: { totalPoints: { increment: awardPoints } },
          });

          const existing = await prisma.globalLeaderboard.findFirst({ where: { userId: currentUser.id } });
          if (existing) {
            await prisma.globalLeaderboard.update({
              where: { id: existing.id },
              data: { totalPoints: { increment: awardPoints } },
            });
          } else {
            await prisma.globalLeaderboard.create({
              data: { userId: currentUser.id, totalPoints: awardPoints },
            });
          }

          // Award XP
          const xpGain = puzzle.xpReward ?? 50;
          const freshUser = await prisma.user.findUnique({
            where: { id: currentUser.id },
            select: { xp: true },
          });
          const newXp = (freshUser?.xp ?? 0) + xpGain;
          const { level, title } = calcLevel(newXp);
          await prisma.user.update({
            where: { id: currentUser.id },
            data: { xp: newXp, level, xpTitle: title },
          });
        }
      }
    } catch (persistErr) {
      console.error("[word_crack] Failed to persist progress:", persistErr);
      // Non-fatal: still return the guess result to the player.
    }

    return NextResponse.json({ result, solved, wordLength: word.length });
  } catch (err) {
    console.error("[wordle/guess] Error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
