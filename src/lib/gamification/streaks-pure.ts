// Pure streak-continuation math, separated from streaks.ts (server-only, does
// the DB read/write) for direct unit testing without a database.
import { GAMIFICATION_CONFIG } from "./config";

export type StreakUpdateResult = {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
  milestonesCrossed: number[];
};

// A streak break needs no scheduled job to "detect" — it's simply implied
// when a qualifying day arrives more than one calendar day after
// lastQualifyingDate, at which point the streak resets to 1 (today) rather
// than incrementing.
export function computeStreakUpdate(params: {
  lastQualifyingDate: string | null;
  currentStreak: number;
  longestStreak: number;
  todayKey: string;
  yesterdayKey: string;
}): StreakUpdateResult {
  if (params.lastQualifyingDate === params.todayKey) {
    return {
      currentStreak: params.currentStreak,
      longestStreak: params.longestStreak,
      isNewDay: false,
      milestonesCrossed: [],
    };
  }

  const continuing = params.lastQualifyingDate === params.yesterdayKey;
  const newCurrentStreak = continuing ? params.currentStreak + 1 : 1;
  const newLongestStreak = Math.max(params.longestStreak, newCurrentStreak);
  const milestonesCrossed = GAMIFICATION_CONFIG.streakMilestones.filter((m) => m === newCurrentStreak);

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    isNewDay: true,
    milestonesCrossed,
  };
}
