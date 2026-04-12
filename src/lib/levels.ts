export interface LevelReward {
  points?: number;
  hintTokens?: number;
  skipTokens?: number;
  label: string;
}

export interface LevelDef {
  level: number;
  xpRequired: number; // total XP needed to REACH this level
  title: string;
  reward?: LevelReward;
}

// 20 levels. xpRequired = total cumulative XP needed to reach that level.
export const LEVELS: LevelDef[] = [
  { level: 1,  xpRequired: 0,      title: "Newcomer"       },
  { level: 2,  xpRequired: 100,    title: "Apprentice",    reward: { points: 100,                           label: "+100 Points" } },
  { level: 3,  xpRequired: 250,    title: "Puzzle Scout",  reward: { points: 150, hintTokens: 1,            label: "+150 Points & 1 Hint Token" } },
  { level: 4,  xpRequired: 500,    title: "Code Breaker"   },
  { level: 5,  xpRequired: 900,    title: "Cipher Seeker", reward: { points: 200, skipTokens: 1,            label: "+200 Points & 1 Skip Token" } },
  { level: 6,  xpRequired: 1400,   title: "Riddle Hunter"  },
  { level: 7,  xpRequired: 2100,   title: "Lock Prober",   reward: { points: 300, hintTokens: 1,            label: "+300 Points & 1 Hint Token" } },
  { level: 8,  xpRequired: 3000,   title: "Vault Prober"   },
  { level: 9,  xpRequired: 4200,   title: "Mind Bender"    },
  { level: 10, xpRequired: 5800,   title: "Enigma Solver", reward: { points: 500, hintTokens: 2, skipTokens: 1, label: "+500 Points, 2 Hint Tokens & 1 Skip Token" } },
  { level: 11, xpRequired: 7800,   title: "Shadow Cracker" },
  { level: 12, xpRequired: 10000,  title: "Cipher Adept",  reward: { points: 600, hintTokens: 1,            label: "+600 Points & 1 Hint Token" } },
  { level: 13, xpRequired: 13000,  title: "Puzzle Warden"  },
  { level: 14, xpRequired: 17000,  title: "Vault Breaker"  },
  { level: 15, xpRequired: 22000,  title: "Code Phantom",  reward: { points: 750, skipTokens: 2,            label: "+750 Points & 2 Skip Tokens" } },
  { level: 16, xpRequired: 28000,  title: "Riddle Sage"    },
  { level: 17, xpRequired: 35000,  title: "Enigma Master", reward: { points: 900, hintTokens: 2,            label: "+900 Points & 2 Hint Tokens" } },
  { level: 18, xpRequired: 44000,  title: "Cipher Legend"  },
  { level: 19, xpRequired: 55000,  title: "Puzzle Warlord" },
  { level: 20, xpRequired: 70000,  title: "Grand Cipher",  reward: { points: 1000, hintTokens: 3, skipTokens: 2, label: "+1,000 Points, 3 Hint Tokens & 2 Skip Tokens" } },
];

/** Calculate level and title from total XP. */
export function calcLevel(totalXp: number): { level: number; title: string; currentXp: number; nextLevelXp: number; progress: number } {
  let current = LEVELS[0];
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVELS[i].xpRequired) {
      current = LEVELS[i];
      break;
    }
  }

  const isMaxLevel = current.level === LEVELS[LEVELS.length - 1].level;
  const next = isMaxLevel ? null : LEVELS[current.level]; // LEVELS is 0-indexed, level 1 = index 0

  const currentXp = totalXp - current.xpRequired;
  const nextLevelXp = next ? next.xpRequired - current.xpRequired : 1;
  const progress = isMaxLevel ? 100 : Math.min(100, Math.floor((currentXp / nextLevelXp) * 100));

  return {
    level: current.level,
    title: current.title,
    currentXp,
    nextLevelXp,
    progress,
  };
}

/** XP defaults by difficulty — used as hints in the admin form. */
export const XP_DEFAULTS: Record<string, number> = {
  easy:    25,
  medium:  50,
  hard:    100,
  extreme: 175,
};
