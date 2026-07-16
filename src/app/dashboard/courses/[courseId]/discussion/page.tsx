import { notFound } from "next/navigation";
import Link from "next/link";
import { MessageSquarePlusIcon } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { canAccessCourseDiscussion } from "@/lib/community/access";
import { listThreads } from "@/lib/community/threads";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import ThreadCard from "@/components/community/ThreadCard";
import DiscussionActionsProvider from "./DiscussionActionsProvider";
import DiscussionPageShell from "./DiscussionPageShell";
import { getCourseShell } from "./course-shell";

export default async function CourseDiscussionPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await requireUser();
  const { courseId } = await params;
  const { page: pageParam } = await searchParams;

  // Access is re-checked on every load (not just at nav-render time) so a
  // revoked enrollment hides the board immediately while leaving the
  // learner's historical posts/XP untouched for everyone else.
  const canAccess = await canAccessCourseDiscussion(user.id, courseId, user.role as "ADMIN" | "STUDENT");
  if (!canAccess) notFound();

  const shell = await getCourseShell(courseId, user.id);
  const page = Math.max(1, Number(pageParam) || 1);
  const threadsResult = await listThreads({ courseId }, page, 20);

  return (
    <DiscussionActionsProvider courseId={courseId}>
      <DiscussionPageShell courseId={courseId} shell={shell}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Discussion</h1>
            <p className="text-sm text-muted-foreground">Ask questions and discuss this course with fellow learners.</p>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link href={`/dashboard/courses/${courseId}/discussion/new`}>
              <MessageSquarePlusIcon className="size-4" />
              New Post
            </Link>
          </Button>
        </div>

        {threadsResult.items.length === 0 ? (
          <EmptyState
            title="No discussions yet"
            description="Be the first to ask a question or start a conversation."
            action={
              <Button asChild size="sm">
                <Link href={`/dashboard/courses/${courseId}/discussion/new`}>Start Discussion</Link>
              </Button>
            }
          />
        ) : (
          <div className="space-y-2">
            {threadsResult.items.map((thread) => (
              <ThreadCard key={thread.id} thread={thread} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          pageSize={20}
          total={threadsResult.total}
          buildHref={(p) => `/dashboard/courses/${courseId}/discussion${p > 1 ? `?page=${p}` : ""}`}
        />
      </DiscussionPageShell>
    </DiscussionActionsProvider>
  );
}
