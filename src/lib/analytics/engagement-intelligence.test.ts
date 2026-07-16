import { describe, it, expect } from "vitest";
import { describeTransition } from "./segment-history";
import { categoryFor } from "./gamification-analytics";
import { bucketFor } from "./consistency";
import { classifySegment } from "./learner-segments";
import type { AnalyticsSettings } from "./settings";

describe("describeTransition", () => {
  it("uses singular wording for a single learner", () => {
    expect(describeTransition({ from: "AT_RISK", to: "ACTIVE", count: 1 })).toBe("1 learner moved from At Risk to Active");
  });
  it("uses plural wording for multiple learners", () => {
    expect(describeTransition({ from: "ACTIVE", to: "SLOWING_DOWN", count: 5 })).toBe("5 learners moved from Active to Slowing Down");
  });
});

describe("categoryFor (XP rule -> category mapping)", () => {
  it("maps known learning rule codes to Learning Progress", () => {
    expect(categoryFor("LESSON_COMPLETED")).toBe("Learning Progress");
    expect(categoryFor("COURSE_COMPLETED")).toBe("Learning Progress");
  });
  it("maps quiz rule codes to Quizzes", () => {
    expect(categoryFor("QUIZ_PERFECT_SCORE")).toBe("Quizzes");
  });
  it("maps discussion rule codes to Community", () => {
    expect(categoryFor("DISCUSSION_REPLY")).toBe("Community");
  });
  it("falls back to Other for unmapped or null rule codes", () => {
    expect(categoryFor("SOME_FUTURE_RULE")).toBe("Other");
    expect(categoryFor(null)).toBe("Other");
  });
});

describe("bucketFor (active-day distribution buckets)", () => {
  it("buckets boundary values correctly", () => {
    expect(bucketFor(1)).toBe("1");
    expect(bucketFor(2)).toBe("2-3");
    expect(bucketFor(3)).toBe("2-3");
    expect(bucketFor(4)).toBe("4-7");
    expect(bucketFor(7)).toBe("4-7");
    expect(bucketFor(8)).toBe("8+");
    expect(bucketFor(30)).toBe("8+");
  });
});

describe("classifySegment (reused, unmodified Phase 1 logic)", () => {
  const settings: AnalyticsSettings = { activeWindowDays: 7, slowingDownDays: 7, atRiskDays: 14, dormantDays: 30 };

  it("classifies a learner with no recent activity and an incomplete course as at-risk", () => {
    const segment = classifySegment(
      {
        userId: "u1",
        joinedAt: new Date(Date.now() - 60 * 86400000),
        currentStreak: 0,
        daysSinceLastQualifying: 20,
        qualifyingDaysRecentWindow: 0,
        qualifyingDaysPriorWindow: 3,
        qualifyingDaysLast30: 0,
        hasIncompleteCourse: true,
      },
      settings,
    );
    expect(segment).toBe("AT_RISK");
  });

  it("classifies a long-inactive learner as dormant even without an incomplete course", () => {
    const segment = classifySegment(
      {
        userId: "u2",
        joinedAt: new Date(Date.now() - 90 * 86400000),
        currentStreak: 0,
        daysSinceLastQualifying: 45,
        qualifyingDaysRecentWindow: 0,
        qualifyingDaysPriorWindow: 0,
        qualifyingDaysLast30: 0,
        hasIncompleteCourse: false,
      },
      settings,
    );
    expect(segment).toBe("DORMANT");
  });
});
