import { describe, it, expect } from "vitest";
import { computeLevelForXp, computeLevelProgress, type LevelInfo } from "./levels-pure";

const LEVELS: LevelInfo[] = [
  { id: "1", order: 1, name: "Explorer", minXp: 0 },
  { id: "2", order: 2, name: "Learner", minXp: 250 },
  { id: "3", order: 3, name: "Practitioner", minXp: 750 },
  { id: "4", order: 4, name: "Builder", minXp: 1500 },
];

describe("computeLevelForXp", () => {
  it("returns the first level at 0 XP", () => {
    expect(computeLevelForXp(LEVELS, 0)?.name).toBe("Explorer");
  });
  it("returns the level exactly at its threshold", () => {
    expect(computeLevelForXp(LEVELS, 250)?.name).toBe("Learner");
  });
  it("returns the previous level just below a threshold", () => {
    expect(computeLevelForXp(LEVELS, 249)?.name).toBe("Explorer");
  });
  it("returns the top level once XP exceeds every threshold", () => {
    expect(computeLevelForXp(LEVELS, 999_999)?.name).toBe("Builder");
  });
  it("returns null for an empty level list", () => {
    expect(computeLevelForXp([], 100)).toBeNull();
  });
});

describe("computeLevelProgress", () => {
  it("computes progress toward the next level", () => {
    const progress = computeLevelProgress(LEVELS, 500);
    expect(progress?.currentLevel.name).toBe("Learner");
    expect(progress?.nextLevel?.name).toBe("Practitioner");
    expect(progress?.xpIntoLevel).toBe(250);
    expect(progress?.xpForNextLevel).toBe(500);
    expect(progress?.progressPercent).toBe(50);
  });

  it("caps progress at 100% for the top level", () => {
    const progress = computeLevelProgress(LEVELS, 5000);
    expect(progress?.currentLevel.name).toBe("Builder");
    expect(progress?.nextLevel).toBeNull();
    expect(progress?.progressPercent).toBe(100);
  });

  it("returns null for an empty level list", () => {
    expect(computeLevelProgress([], 100)).toBeNull();
  });
});
