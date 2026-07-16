"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeAccess, type DurationChoice } from "@/lib/access";
import { grantCourseAccess } from "@/lib/entitlements";

export type EnrollActionState = { error?: string; success?: boolean };

const DURATION_CHOICES: DurationChoice[] = ["3", "6", "9", "12", "custom", "forever"];

function parseDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function enrollLearner(
  _prevState: EnrollActionState,
  formData: FormData,
): Promise<EnrollActionState> {
  await requireAdmin();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const courseId = String(formData.get("courseId") ?? "").trim();
  const durationChoice = String(formData.get("duration") ?? "") as DurationChoice;
  const startDateInput = parseDate(formData.get("accessStartAt"));
  const customEndDate = parseDate(formData.get("customEndDate"));

  if (!email) return { error: "Learner email is required." };
  if (!courseId) return { error: "Select a course." };
  if (!DURATION_CHOICES.includes(durationChoice)) return { error: "Select an access duration." };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { error: `No user found with the email "${email}". They need an account before you can enroll them.` };
  }

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return { error: "Course not found." };

  const accessStartAt = startDateInput ?? new Date();

  let access;
  try {
    access = computeAccess(accessStartAt, durationChoice, customEndDate);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not compute the access duration." };
  }

  await grantCourseAccess(prisma, {
    userId: user.id,
    courseId,
    source: "ADMIN_ASSIGNED",
    startAt: accessStartAt,
    accessEndAt: access.accessEndAt,
    accessDurationMonths: access.accessDurationMonths,
    isPermanent: access.isPermanent,
  });

  revalidatePath("/admin/enrollments/new");
  return { success: true };
}
