import { describe, it, expect } from "vitest";
import { computeStreakUpdate } from "./streaks-pure";

describe("computeStreakUpdate", () => {
  it("starts a streak at 1 for a first-ever qualifying day", () => {
    const result = computeStreakUpdate({
      lastQualifyingDate: null,
      currentStreak: 0,
      longestStreak: 0,
      todayKey: "2026-01-05",
      yesterdayKey: "2026-01-04",
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(1);
    expect(result.isNewDay).toBe(true);
  });

  it("continues the streak when yesterday was the last qualifying day", () => {
    const result = computeStreakUpdate({
      lastQualifyingDate: "2026-01-04",
      currentStreak: 6,
      longestStreak: 6,
      todayKey: "2026-01-05",
      yesterdayKey: "2026-01-04",
    });
    expect(result.currentStreak).toBe(7);
    expect(result.longestStreak).toBe(7);
    expect(result.milestonesCrossed).toEqual([7]);
  });

  it("resets to 1 after a gap (streak break) but preserves the longest streak", () => {
    const result = computeStreakUpdate({
      lastQualifyingDate: "2026-01-01",
      currentStreak: 10,
      longestStreak: 10,
      todayKey: "2026-01-05",
      yesterdayKey: "2026-01-04",
    });
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(10);
    expect(result.isNewDay).toBe(true);
  });

  it("is a no-op if a qualifying day was already recorded today", () => {
    const result = computeStreakUpdate({
      lastQualifyingDate: "2026-01-05",
      currentStreak: 3,
      longestStreak: 5,
      todayKey: "2026-01-05",
      yesterdayKey: "2026-01-04",
    });
    expect(result.currentStreak).toBe(3);
    expect(result.isNewDay).toBe(false);
  });

  it("preserves the longest streak when the new current streak is smaller", () => {
    const result = computeStreakUpdate({
      lastQualifyingDate: "2026-01-04",
      currentStreak: 2,
      longestStreak: 50,
      todayKey: "2026-01-05",
      yesterdayKey: "2026-01-04",
    });
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(50);
  });

  it("does not cross a milestone when the new streak isn't one of the configured thresholds", () => {
    const result = computeStreakUpdate({
      lastQualifyingDate: "2026-01-04",
      currentStreak: 3,
      longestStreak: 3,
      todayKey: "2026-01-05",
      yesterdayKey: "2026-01-04",
    });
    expect(result.currentStreak).toBe(4);
    expect(result.milestonesCrossed).toEqual([]);
  });
});
