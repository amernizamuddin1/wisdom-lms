import type { ReactNode } from "react";
import { AwardIcon, CalendarIcon, ClockIcon, KeyRoundIcon, SignalIcon, UsersIcon } from "lucide-react";
import type { CourseLevel } from "@/generated/prisma/client";

const LEVEL_LABELS: Record<CourseLevel, string> = {
  BEGINNER: "Beginner",
  INTERMEDIATE: "Intermediate",
  ADVANCED: "Advanced",
  ALL_LEVELS: "All Levels",
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function MetaRow({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 font-body text-sm text-muted-foreground">
      <span className="text-foreground/70">{icon}</span>
      {children}
    </div>
  );
}

export default function CourseMetaList({
  level,
  enrolledCount,
  durationMinutes,
  updatedAt,
  certificateEnabled,
  isPermanentAccess,
  accessDurationMonths,
}: {
  level: CourseLevel | null;
  enrolledCount: number;
  durationMinutes: number | null;
  updatedAt: Date;
  certificateEnabled: boolean;
  isPermanentAccess: boolean;
  accessDurationMonths: number | null;
}) {
  return (
    <div className="space-y-2 border-t pt-4">
      {level && (
        <MetaRow icon={<SignalIcon className="size-4" />}>{LEVEL_LABELS[level]} Level</MetaRow>
      )}
      {enrolledCount > 0 && (
        <MetaRow icon={<UsersIcon className="size-4" />}>
          {enrolledCount.toLocaleString()} learner{enrolledCount === 1 ? "" : "s"} enrolled
        </MetaRow>
      )}
      {durationMinutes != null && durationMinutes > 0 && (
        <MetaRow icon={<ClockIcon className="size-4" />}>{formatDuration(durationMinutes)}</MetaRow>
      )}
      <MetaRow icon={<CalendarIcon className="size-4" />}>
        Last updated{" "}
        {updatedAt.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
      </MetaRow>
      {certificateEnabled && (
        <MetaRow icon={<AwardIcon className="size-4" />}>Certificate of completion</MetaRow>
      )}
      <MetaRow icon={<KeyRoundIcon className="size-4" />}>
        {isPermanentAccess ? "Lifetime access" : `Access for ${accessDurationMonths} month${accessDurationMonths === 1 ? "" : "s"}`}
      </MetaRow>
    </div>
  );
}
