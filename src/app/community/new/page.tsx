import { requireUser } from "@/lib/auth";
import { isUserRestricted, getCommunitySettings } from "@/lib/community/access";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import NewThreadForm from "./NewThreadForm";

export default async function NewThreadPage() {
  const user = await requireUser();
  const restricted = await isUserRestricted(user.id);

  if (restricted) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <h1 className="mb-2 text-lg font-semibold text-foreground">Posting unavailable</h1>
          <p className="text-sm text-muted-foreground">
            Your community posting privileges have been restricted. Contact support if you believe this is a mistake.
          </p>
        </CardContent>
      </Card>
    );
  }

  const settings = await getCommunitySettings();
  if (!settings.communityEnabled || !settings.allowGlobalDiscussionCreation) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <h1 className="mb-2 text-lg font-semibold text-foreground">Posting unavailable</h1>
          <p className="text-sm text-muted-foreground">Starting new discussions is currently disabled.</p>
        </CardContent>
      </Card>
    );
  }

  const categories = await prisma.communityCategory.findMany({
    where: {
      isActive: true,
      OR: user.role === "ADMIN" ? undefined : [{ postingPermission: "ANYONE" }],
    },
    orderBy: { displayOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Start a Discussion</h1>
        <p className="text-sm text-muted-foreground">Share a question or start a conversation with the community.</p>
      </div>
      <NewThreadForm categories={categories} canPostAnnouncement={user.role === "ADMIN"} />
    </div>
  );
}
