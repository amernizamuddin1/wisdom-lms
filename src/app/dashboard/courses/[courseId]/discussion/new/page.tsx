import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canAccessCourseDiscussion, isUserRestricted, getCommunitySettings } from "@/lib/community/access";
import { Card, CardContent } from "@/components/ui/card";
import DiscussionPageShell from "../DiscussionPageShell";
import { getCourseShell } from "../course-shell";
import NewCourseThreadForm from "./NewCourseThreadForm";

export default async function NewCourseDiscussionPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await requireUser();
  const { courseId } = await params;

  const canAccess = await canAccessCourseDiscussion(user.id, courseId, user.role as "ADMIN" | "STUDENT");
  if (!canAccess) notFound();

  const shell = await getCourseShell(courseId, user.id);

  const [restricted, settings] = await Promise.all([isUserRestricted(user.id), getCommunitySettings()]);

  return (
    <DiscussionPageShell courseId={courseId} shell={shell}>
      {restricted ? (
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="mb-2 text-lg font-semibold text-foreground">Posting unavailable</h1>
            <p className="text-sm text-muted-foreground">
              Your community posting privileges have been restricted. Contact support if you believe this is a mistake.
            </p>
          </CardContent>
        </Card>
      ) : !settings.communityEnabled ? (
        <Card>
          <CardContent className="py-8 text-center">
            <h1 className="mb-2 text-lg font-semibold text-foreground">Posting unavailable</h1>
            <p className="text-sm text-muted-foreground">Community discussions are currently disabled.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Start a Discussion</h1>
            <p className="text-sm text-muted-foreground">Ask a question or start a conversation about this course.</p>
          </div>
          <NewCourseThreadForm courseId={courseId} />
        </div>
      )}
    </DiscussionPageShell>
  );
}
