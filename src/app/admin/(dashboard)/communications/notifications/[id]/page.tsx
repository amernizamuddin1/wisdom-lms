import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { Button } from "@/components/ui/button";
import NotificationComposer from "./NotificationComposer";
import DuplicateNotificationButton from "../DuplicateNotificationButton";
import DeleteNotificationButton from "../DeleteNotificationButton";

export default async function NotificationEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [notification, courses, bundles, users, branding] = await Promise.all([
    prisma.notification.findUnique({ where: { id } }),
    prisma.course.findMany({ orderBy: { title: "asc" }, select: { id: true, title: true } }),
    prisma.courseBundle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, email: true } }),
    getBranding(),
  ]);

  if (!notification) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{notification.internalName}</h1>
          <p className="text-sm text-muted-foreground">In-app notification</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/communications/notifications">Back to Notifications</Link>
          </Button>
          <DuplicateNotificationButton notificationId={notification.id} />
          {notification.status !== "PUBLISHED" && (
            <DeleteNotificationButton notificationId={notification.id} />
          )}
        </div>
      </div>

      <NotificationComposer
        notification={notification}
        courses={courses.map((c) => ({ id: c.id, label: c.title }))}
        bundles={bundles.map((b) => ({ id: b.id, label: b.name }))}
        users={users}
        primaryColor={branding.primaryColor}
      />
    </div>
  );
}
