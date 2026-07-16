import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  FlameIcon,
  TargetIcon,
  TrophyIcon,
  ZapIcon,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getLearnerProfile, getLearnerTimeline } from "@/lib/analytics/learners";
import { getLearnerCommercialProfile } from "@/lib/analytics/commerce-learners";
import { SEGMENT_LABELS } from "@/lib/analytics/learner-segments";
import { formatHours } from "@/lib/analytics/format";
import { Badge } from "@/components/ui/badge";
import KpiCard from "@/components/analytics/KpiCard";
import LearnerCoursesTable from "./LearnerCoursesTable";
import LearnerTimeline from "./LearnerTimeline";
import LearnerCommercialProfile from "./LearnerCommercialProfile";

export default async function LearnerDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;

  const [profile, timeline, commercialProfile] = await Promise.all([
    getLearnerProfile(userId),
    getLearnerTimeline(userId),
    getLearnerCommercialProfile(userId),
  ]);
  if (!profile) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/analytics/learners" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3.5" />
          Back to Learners
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">{profile.name}</h1>
            <Badge variant="outline">{SEGMENT_LABELS[profile.segment]}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.email}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Joined {profile.joinedAt.toLocaleDateString()} · Last active{" "}
            {profile.lastActiveAt ? profile.lastActiveAt.toLocaleDateString() : "never"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Courses Enrolled" value={profile.coursesEnrolled} icon={BookOpenIcon} />
        <KpiCard label="Courses Completed" value={profile.coursesCompleted} icon={CheckCircle2Icon} />
        <KpiCard label="Overall Progress" value={`${profile.overallProgress}%`} />
        <KpiCard label="Total Learning Time" value={formatHours(profile.totalLearningTimeSeconds)} icon={ClockIcon} />
        <KpiCard label="Current Streak" value={`${profile.currentStreak}d`} icon={FlameIcon} />
        <KpiCard label="Longest Streak" value={`${profile.longestStreak}d`} icon={FlameIcon} />
        <KpiCard label="XP / Level" value={`${profile.xp.toLocaleString()}${profile.levelName ? ` · ${profile.levelName}` : ""}`} icon={ZapIcon} />
        <KpiCard label="Achievements Unlocked" value={profile.achievementsUnlocked} icon={TrophyIcon} />
        <KpiCard label="Average Quiz Score" value={profile.averageQuizScore === null ? "—" : `${profile.averageQuizScore}%`} icon={TargetIcon} />
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-foreground">Courses</h3>
        <LearnerCoursesTable courses={profile.courses} />
      </div>

      {commercialProfile && <LearnerCommercialProfile profile={commercialProfile} />}

      <LearnerTimeline events={timeline} />
    </div>
  );
}
