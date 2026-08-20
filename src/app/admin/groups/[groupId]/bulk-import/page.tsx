import { notFound } from "next/navigation";
import { requireGroupAccess } from "@/lib/auth";
import { getTenantId } from "@/lib/tenant-context";
import { prisma } from "@/lib/prisma";
import GroupBulkImportWizard from "./GroupBulkImportWizard";

export default async function GroupBulkImportPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  await requireGroupAccess(groupId);
  const tenantId = await getTenantId();

  const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
  if (!group) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Bulk Import — {group.name}</h1>
        <p className="text-sm text-muted-foreground">
          Upload a CSV of this institution&apos;s members, optionally enrolling each one in a course.
        </p>
      </div>
      <GroupBulkImportWizard groupId={groupId} />
    </div>
  );
}
