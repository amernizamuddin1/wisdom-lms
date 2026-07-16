"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { findOrCreateUser } from "@/lib/user-provisioning";
import { createOrderFromItems } from "@/lib/orders";
import { fulfillFreeOrder } from "@/lib/order-fulfillment";

export type EnrollFreeState = { error?: string };

export async function selfEnrollFree(
  _prevState: EnrollFreeState,
  formData: FormData,
): Promise<EnrollFreeState> {
  const courseId = String(formData.get("courseId") ?? "");

  const course = await prisma.course.findFirst({
    where: { id: courseId, status: "PUBLISHED", isFree: true },
  });
  if (!course) {
    return { error: "This course isn't available for enrollment." };
  }
  // PAUSED courses still allow new enrollment — learningStatus only gates content
  // access post-enrollment (see CourseAccessNotice), not eligibility to enroll.

  const supabase = await createClient();
  const {
    data: { user: sessionUser },
  } = await supabase.auth.getUser();

  let userId: string;

  if (sessionUser) {
    const profile = await prisma.user.findUnique({ where: { id: sessionUser.id } });
    if (!profile) {
      return { error: "Your account isn't fully set up. Please contact support." };
    }
    userId = profile.id;
  } else {
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!name) return { error: "Name is required." };
    if (!email) return { error: "Email is required." };

    // Unlike the paid checkout flow (where a successful payment shouldn't be
    // stranded by an account mismatch), free self-enroll blocks on an existing
    // account rather than silently attaching to it — an anonymous name+email form
    // is not proof of ownership of that email.
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "An account with this email already exists. Please log in to enroll." };
    }

    const result = await findOrCreateUser(email, name, supabase);
    if (!result.ok) return { error: result.error };
    if (result.signInError) {
      return { error: "Account created, but we couldn't sign you in automatically. Please log in." };
    }
    userId = result.userId;
  }

  // Free enrollment still goes through the same Order/OrderItem/OrderPayment
  // pipeline as every other purchase (paid or bundle) — just without a cart
  // round-trip, for the fastest possible one-click path on a free course.
  const orderResult = await createOrderFromItems(userId, [{ itemType: "COURSE", courseId }]);
  if (!orderResult.ok) return { error: orderResult.error };
  await fulfillFreeOrder(orderResult.orderId);

  redirect(`/dashboard/courses/${courseId}`);
}
