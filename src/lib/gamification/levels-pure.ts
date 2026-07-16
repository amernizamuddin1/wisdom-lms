// Pure level math, deliberately separated from levels.ts (which is
// server-only and does the DB fetch) so it's directly unit-testable without
// a database or the server-only import guard.

export type LevelInfo = {
  id: string;
  name: string;
  order: number;
  minXp: number;
};

export type LevelProgress = {
  currentLevel: LevelInfo;
  nextLevel: LevelInfo | null;
  currentXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number | null;
  progressPercent: number;
};

// Assumes `levels` is sorted by `order` ascending with monotonically
// increasing `minXp` (an admin-managed invariant, not enforced at the DB
// level in this phase since there's no admin UI yet to violate it).
export function computeLevelForXp(levels: LevelInfo[], totalXp: number): LevelInfo | null {
  let current: LevelInfo | null = null;
  for (const level of levels) {
    if (totalXp >= level.minXp) current = level;
    else break;
  }
  return current ?? levels[0] ?? null;
}

export function computeLevelProgress(levels: LevelInfo[], totalXp: number): LevelProgress | null {
  if (levels.length === 0) return null;

  let currentIndex = 0;
  for (let i = 0; i < levels.length; i++) {
    if (totalXp >= levels[i].minXp) currentIndex = i;
    else break;
  }

  const currentLevel = levels[currentIndex];
  const nextLevel = levels[currentIndex + 1] ?? null;

  const xpIntoLevel = totalXp - currentLevel.minXp;
  const xpForNextLevel = nextLevel ? nextLevel.minXp - currentLevel.minXp : null;
  const progressPercent =
    nextLevel && xpForNextLevel ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 100;

  return { currentLevel, nextLevel, currentXp: totalXp, xpIntoLevel, xpForNextLevel, progressPercent };
}
