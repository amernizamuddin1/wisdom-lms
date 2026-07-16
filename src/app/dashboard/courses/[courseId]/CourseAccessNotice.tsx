import Link from "next/link";
import { ClockIcon, PauseCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CourseAccessNotice({
  title,
  variant,
  accessEndAt,
}: {
  title: string;
  variant: "paused" | "expired";
  accessEndAt?: Date | null;
}) {
  const Icon = variant === "paused" ? PauseCircleIcon : ClockIcon;
  const heading = variant === "paused" ? "This course is paused" : "Your access has ended";
  const message =
    variant === "paused"
      ? "This course is temporarily paused by the instructor. Your enrollment and progress are safe — check back soon."
      : `Your access to this course ended on ${accessEndAt?.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}. Contact support to renew your access.`;

  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border bg-card p-10 text-center">
      <Icon className="size-10 text-muted-foreground" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="font-medium text-foreground">{heading}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      <Button variant="outline" asChild>
        <Link href="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
}
