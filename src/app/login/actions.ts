"use server";

import { getOptionalUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { getBranding } from "@/lib/branding";

// After a password reset (shared by the student and admin login forms), send
// the now-authenticated user wherever their role actually leads — an admin
// landing on the student dashboard after resetting their password would be
// functional but wrong, since /admin is where their work actually is.
export async function postResetRedirectPath(): Promise<string> {
  const user = await getOptionalUser();
  if (user?.role === "ADMIN") return "/admin";
  return "/dashboard";
}

// Supabase's own password-reset email is unbranded (arrives "from Supabase")
// and, on the free tier, rate-limited to a handful of sends per day — both
// unacceptable for a real product. Instead we generate the recovery link via
// the admin API (no email sent by Supabase) and deliver it ourselves through
// Resend, matching every other transactional email in this app. The link
// itself is still a genuine Supabase recovery link — clicking it verifies the
// token and hands off to /login/reset-password exactly as it would have
// otherwise, so nothing about the actual reset mechanics changes.
export async function requestPasswordReset(email: string, redirectTo: string): Promise<{ ok: true }> {
  const trimmedEmail = email.trim().toLowerCase();

  // Always report success either way — confirming/denying that an email has
  // an account would let this form be used to enumerate registered users.
  if (!trimmedEmail) return { ok: true };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: trimmedEmail,
    options: { redirectTo },
  });

  if (error || !data.properties?.action_link) {
    // No account with this email (or a transient Supabase error) — say
    // nothing, for the same enumeration reason as above.
    return { ok: true };
  }

  const branding = await getBranding();

  void sendMail({
    to: trimmedEmail,
    subject: `Reset your ${branding.platformName} password`,
    html: `
      <p>Hi,</p>
      <p>We received a request to reset the password for your ${branding.platformName} account.</p>
      <p><a href="${data.properties.action_link}">Click here to set a new password</a></p>
      <p>This link expires shortly, so use it soon. If you didn't request this, you can safely ignore this email — your password won't be changed.</p>
      <p>Cheers,<br />The ${branding.platformName} Support Team</p>
    `,
  });

  return { ok: true };
}
