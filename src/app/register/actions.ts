"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { createUserAccount } from "@/lib/user-provisioning";
import { sendMail } from "@/lib/email";

export type RegisterState = { error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function registerUser(
  _prevState: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!name) return { error: "Full name is required." };
  if (!email || !EMAIL_RE.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists. Please log in instead." };
  }

  const result = await createUserAccount({ email, name, password, phone, role: "STUDENT" });
  if (!result.ok) {
    return { error: result.error };
  }

  const supabase = await createClient();
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
  if (signInErr) {
    return { error: "Account created — please log in." };
  }

  void sendMail({
    to: email,
    subject: "Welcome!",
    html: `<p>Hi ${name},</p><p>Your account has been created. You can now browse courses and start learning.</p>`,
  });

  redirect("/dashboard");
}
