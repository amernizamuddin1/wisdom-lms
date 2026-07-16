import "server-only";
import { Resend } from "resend";
import { getResendCredentials } from "@/lib/settings";

export interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

// No-ops (with a console warning) when Resend isn't configured yet, matching the
// existing "gracefully degrade when an integration isn't set up" convention used
// for Razorpay throughout this codebase. Callers should treat this as
// fire-and-forget — a failed/skipped send should never fail the request it's
// attached to (registration, order confirmation).
export async function sendMail(params: SendMailParams): Promise<void> {
  const creds = await getResendCredentials();
  if (!creds) {
    console.warn(`Resend not configured — skipping email to ${params.to}: "${params.subject}"`);
    return;
  }

  try {
    const resend = new Resend(creds.apiKey);
    const from = creds.senderName ? `${creds.senderName} <${creds.senderEmail}>` : creds.senderEmail;
    await resend.emails.send({
      from,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  } catch (e) {
    console.error("Failed to send email via Resend", e);
  }
}
