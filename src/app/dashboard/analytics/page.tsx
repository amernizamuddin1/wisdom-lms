import {
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  LayersIcon,
  ZapIcon,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getAnalyticsSnapshot,
  getCourseProgress,
  getDailyActivity,
  getHeatmapData,
} from "@/lib/gamification/analytics-data";
import { getNextMilestone } from "@/lib/gamification/next-milestone";
import { getDateKeyForUser, previousDateKey } from "@/lib/gamification/timezone";
import { formatDuration, formatNumber } from "@/lib/gamification/format";
import MetricCard from "@/components/gamification/MetricCard";
import LevelProgressCard from "@/components/gamification/LevelProgressCard";
import AnalyticsCharts from "./AnalyticsCharts";
import ActivityHeatmap from "./ActivityHeatmap";
import CourseProgressList from "./CourseProgressList";
import RecentAchievements from "./RecentAchievements";

function heatmapStartDate(todayKey: string): string {
  let key = todayKey;
  for (let i = 0; i < 370; i++) key = previousDateKey(key);
  return key;
}

export default async function AnalyticsPage() {
  const user = await requireUser();
  const todayKey = getDateKeyForUser(new Date(), user.timezone);

  const [snapshot, dailyActivity, heatmapDays, courseProgress, recentAchievements, nextMilestone] =
    await Promise.all([
      getAnalyticsSnapshot(user.id),
      getDailyActivity(user.id, null),
      getHeatmapData(user.id, heatmapStartDate(todayKey)),
      getCourseProgress(user.id),
      prisma.userAchievement.findMany({
        where: { userId: user.id },
        include: { achievement: true },
        orderBy: { earnedAt: "desc" },
        take: 6,
      }),
      getNextMilestone(user.id),
    ]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-foreground">Analytics</h2>

      {/* Section A: Learning Snapshot */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MetricCard label="Courses completed" value={snapshot.coursesCompleted} icon={CheckCircle2Icon} />
        <MetricCard label="Modules completed" value={snapshot.modulesCompleted} icon={LayersIcon} />
        <MetricCard label="Lessons completed" value={snapshot.lessonsCompleted} icon={BookOpenIcon} />
        <MetricCard label="Learning time" value={formatDuration(snapshot.totalLearningTimeSeconds)} icon={ClockIcon} />
        <MetricCard label="Current streak" value={`${snapshot.currentStreak}d`} icon={FlameIcon} />
        <MetricCard label="Total XP" value={formatNumber(snapshot.totalXp)} icon={ZapIcon} />
      </div>

      {/* Section B: Current Level */}
      <LevelProgressCard levelProgress={snapshot.levelProgress} />

      {/* Section G: Next Milestone (placed near the top — it's the single actionable takeaway) */}
      <div className="rounded-lg border border-primary/20 bg-surface-brand-subtle px-4 py-3 text-sm font-medium text-foreground">
        {nextMilestone}
      </div>

      {/* Section C: Learning Activity charts */}
      <AnalyticsCharts data={dailyActivity} />

      {/* Section D: Activity Heatmap */}
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-3 font-semibold text-foreground">Activity Heatmap</h3>
        <ActivityHeatmap days={heatmapDays} todayKey={todayKey} />
      </div>

      {/* Section E: Course Progress */}
      <CourseProgressList courses={courseProgress} />

      {/* Section F: Recent Achievements */}
      <RecentAchievements
        achievements={recentAchievements.map((a) => ({
          id: a.id,
          name: a.achievement.name,
          assetPath: a.achievement.assetPath,
          earnedAt: a.earnedAt,
        }))}
      />

      {/* Additional metrics not covered by the layout sections above */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard label="Longest streak" value={`${snapshot.longestStreak}d`} />
        <MetricCard label="Active days" value={snapshot.totalActiveDays} />
        <MetricCard label="Video watch time" value={formatDuration(snapshot.totalVideoWatchTimeSeconds)} />
        <MetricCard label="Certificates earned" value={snapshot.certificatesEarned} />
        <MetricCard label="Quizzes attempted" value={snapshot.quizzesAttempted} />
        <MetricCard label="Quizzes passed" value={snapshot.quizzesPassed} />
        <MetricCard label="Quiz pass rate" value={snapshot.quizPassRate != null ? `${snapshot.quizPassRate}%` : "—"} />
        <MetricCard
          label="Average quiz score"
          value={snapshot.averageQuizScore != null ? `${snapshot.averageQuizScore}%` : "—"}
        />
        <MetricCard label="Perfect quiz scores" value={snapshot.perfectQuizScores} />
        <MetricCard label="Discussion posts" value={snapshot.discussionPostsCreated} />
        <MetricCard label="Discussion replies" value={snapshot.discussionRepliesCreated} />
        <MetricCard label="Helpful reactions received" value={snapshot.helpfulReactionsReceived} />
      </div>
    </div>
  );
}
