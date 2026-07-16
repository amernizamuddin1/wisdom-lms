import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

import type { PrismaTransaction } from "@/lib/prisma";

type Tx = PrismaTransaction;

export type ModerationActionType =
  | "EDIT"
  | "HIDE"
  | "RESTORE"
  | "DELETE"
  | "RESTORE_DELETED"
  | "PIN"
  | "UNPIN"
  | "LOCK"
  | "UNLOCK"
  | "MARK_RESOLVED"
  | "UNMARK_RESOLVED"
  | "ACCEPT_ANSWER"
  | "CHANGE_ACCEPTED_ANSWER"
  | "RESTRICT_USER"
  | "RESTORE_POSTING"
  | "REVIEW_REPORT"
  | "RESOLVE_REPORT"
  | "DISMISS_REPORT";

export type LogModerationActionParams = {
  actorId: string;
  actionType: ModerationActionType;
  targetUserId?: string;
  entityType?: string;
  entityId?: string;
  threadId?: string;
  previousState?: string;
  newState?: string;
  previousContent?: string;
  newContent?: string;
  reason?: string;
};

// Append-only audit log — no update/delete surface, matching the
// AdminAuditLog convention. Called from every admin (and self-service
// delete/edit) mutation that changes moderation-relevant state.
export async function logModerationAction(tx: Tx, params: LogModerationActionParams): Promise<void> {
  const tenantId = await getTenantId();
  await tx.communityModerationLog.create({
    data: {
      actorId: params.actorId,
      actionType: params.actionType,
      targetUserId: params.targetUserId,
      entityType: params.entityType,
      entityId: params.entityId,
      threadId: params.threadId,
      previousState: params.previousState,
      newState: params.newState,
      previousContent: params.previousContent,
      newContent: params.newContent,
      reason: params.reason,
      tenantId,
    },
  });
}
