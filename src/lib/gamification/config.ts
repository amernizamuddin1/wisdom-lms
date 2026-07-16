// Phase-1 hardcoded gamification tunables. These become admin-configurable
// via a GamificationSettings table + admin UI in a later phase — centralized
// here in the meantime so nothing is scattered as magic numbers.
export const GAMIFICATION_CONFIG = {
  /** Minutes of active learning time in a day for it to count as a qualifying streak day. */
  streakQualifyingMinutes: 10,
  /** Seconds of no interaction before learning-time accumulation pauses. */
  inactivityThresholdSeconds: 90,
  /** How often the client flushes accumulated learning time to the server. */
  heartbeatIntervalSeconds: 20,
  /** Hard per-flush cap so a tampered client clock can't inflate one heartbeat. */
  maxSecondsPerHeartbeat: 30,
  /** Hard daily cap on counted learning time per user, to blunt residual abuse. */
  maxLearningSecondsPerDay: 12 * 60 * 60,
  /** Hour (24h, user-local) after which a qualifying session counts toward "Night Owl". */
  nightOwlAfterHour: 21,
  /** Streak milestones that fire a STREAK_MILESTONE_REACHED event + badge check. */
  streakMilestones: [3, 7, 14, 30, 60, 100] as const,
} as const;
