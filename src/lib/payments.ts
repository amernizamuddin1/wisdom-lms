import "server-only";
import { prisma } from "@/lib/prisma";
import { findOrCreateUser } from "@/lib/user-provisioning";
import { Prisma } from "@/generated/prisma/client";
import { grantCourseAccess } from "@/lib/entitlements";
import { computeAccess, durationChoiceFor } from "@/lib/access";
import type { createClient } from "@/lib/supabase/server";
import { getTenantId } from "@/lib/tenant-context";

export interface FinalizeRazorpayPaymentParams {
  gatewayOrderId: string;
  gatewayPaymentId: string;
  courseId: string;
  name: string;
  email: string;
  amountPaise: number;
  supabase: Awaited<ReturnType<typeof createClient>> | null;
}

export interface FinalizeResult {
  alreadyProcessed: boolean;
}

// Idempotent on gatewayPaymentId (unique constraint) — safe to call from both the
// signature-verified client callback and the webhook, whichever arrives first "wins"
// and the other becomes a no-op. Called from BOTH paths: the client-verify path passes
// a real cookie-bound `supabase` client so a newly created buyer gets signed in; the
// webhook path passes `supabase: null` since there's no browser session to attach in a
// server-to-server call — a newly-created buyer there stays logged out and can use
// "forgot password" to get in later. The webhook path is still the source of truth for
// entitlement (Enrollment + Payment), it just can't grant an interactive session.
export async function finalizeRazorpayPayment(
  params: FinalizeRazorpayPaymentParams,
): Promise<FinalizeResult> {
  const { gatewayOrderId, gatewayPaymentId, courseId, name, email, amountPaise, supabase } =
    params;

  const existing = await prisma.payment.findUnique({ where: { gatewayPaymentId } });
  if (existing) {
    return { alreadyProcessed: true };
  }

  const userResult = await findOrCreateUser(email, name, supabase);
  if (!userResult.ok) {
    throw new Error(userResult.error);
  }
  const userId = userResult.userId;
  const amount = amountPaise / 100;
  const tenantId = await getTenantId();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          tenantId,
          userId,
          courseId,
          gateway: "RAZORPAY",
          gatewayOrderId,
          gatewayPaymentId,
          currency: "INR",
          amount,
          status: "COMPLETED",
        },
      });

      const course = await tx.course.findUniqueOrThrow({
        where: { id: courseId },
        select: { accessDurationMonths: true, isPermanentAccess: true },
      });
      const startAt = new Date();
      const access = course.isPermanentAccess
        ? computeAccess(startAt, "forever", null)
        : computeAccess(startAt, durationChoiceFor(course.accessDurationMonths), null);

      await grantCourseAccess(tx, {
        userId,
        courseId,
        source: "DIRECT",
        startAt,
        accessEndAt: access.accessEndAt,
        accessDurationMonths: access.accessDurationMonths,
        isPermanent: access.isPermanent,
      });

      const priceRow = await tx.coursePrice.findUnique({
        where: { courseId_currency: { courseId, currency: "INR" } },
      });
      if (priceRow?.discountedPrice != null) {
        const discountedPaise = Math.round(Number(priceRow.discountedPrice) * 100);
        if (discountedPaise === amountPaise) {
          await tx.coursePrice.update({
            where: { id: priceRow.id },
            data: { discountedEnrollmentsUsed: { increment: 1 } },
          });
        }
      }
    });
  } catch (e) {
    // A unique-constraint violation on gatewayPaymentId here means the other path
    // (client callback vs. webhook) completed this exact payment in the tiny window
    // between our findUnique check above and this write — treat as already-processed.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { alreadyProcessed: true };
    }
    throw e;
  }

  return { alreadyProcessed: false };
}
