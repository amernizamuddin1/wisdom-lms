import "server-only";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getResendCredentials } from "@/lib/settings";
import { getBranding } from "@/lib/branding";
import { resolveAudience } from "@/lib/communications/audience";
import { wrapEmailHtml } from "@/lib/email-templates/layout";
import { personalize } from "@/lib/email-templates/starters";
import type { EmailCampaign } from "@/generated/prisma/client";
import { getTenantId } from "@/lib/tenant-context";

const BATCH_SIZE = 100;
const MAX_RETRIES = 2;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function sendChunkWithRetry(
  resend: Resend,
  emails: { from: string; to: string; subject: string; html: string; replyTo?: string }[],
): Promise<{ index: number; messageId?: string; error?: string }[]> {
  let attempt = 0;
  let lastError: string | undefined;

  while (attempt <= MAX_RETRIES) {
    try {
      const res = await resend.batch.send(emails, { batchValidation: "permissive" });

      if (res.error) {
        lastError = res.error.message;
        attempt++;
        continue;
      }

      const errorByIndex = new Map<number, string>();
      for (const e of (res.data?.errors ?? [])) errorByIndex.set(e.index, e.message);

      return emails.map((_, i) => {
        const err = errorByIndex.get(i);
        if (err) return { index: i, error: err };
        return { index: i, messageId: res.data?.data[i]?.id };
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Unknown error";
      attempt++;
    }
  }

  // Whole chunk failed after retries — every recipient in it is recorded as failed.
  return emails.map((_, i) => ({ index: i, error: lastError ?? "Send failed after retries" }));
}

// Sends a DRAFT/SCHEDULED campaign. Atomically claims it (DRAFT/SCHEDULED ->
// SENDING) first so concurrent triggers (e.g. a double click, or a cron pass
// overlapping a manual send) can never send the same campaign twice.
export async function sendEmailCampaign(campaignId: string): Promise<{ ok: boolean; error?: string }> {
  const tenantId = await getTenantId();
  const claimed = await prisma.emailCampaign.updateMany({
    where: { id: campaignId, status: { in: ["DRAFT", "SCHEDULED"] } },
    data: { status: "SENDING" },
  });
  if (claimed.count === 0) {
    return { ok: false, error: "Campaign is not in a sendable state (already sending/sent, or not found)." };
  }

  const campaign = await prisma.emailCampaign.findUniqueOrThrow({ where: { id: campaignId } });

  try {
    const creds = await getResendCredentials();
    if (!creds) {
      await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
      return { ok: false, error: "Resend is not configured in Admin Settings." };
    }

    const branding = await getBranding();
    const recipients = await resolveAudience(campaign);

    if (recipients.length === 0) {
      await prisma.emailCampaign.update({
        where: { id: campaignId },
        data: { status: "FAILED", recipientCount: 0 },
      });
      return { ok: false, error: "No valid recipients resolved for this audience." };
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { recipientCount: recipients.length },
    });

    // Seed recipient rows up front (PENDING) so partial-failure state is
    // visible even if the process is interrupted mid-send.
    await prisma.emailCampaignRecipient.createMany({
      data: recipients.map((r) => ({ tenantId, campaignId, userId: r.id, email: r.email })),
      skipDuplicates: true,
    });

    const resend = new Resend(creds.apiKey);
    const from = campaign.fromEmail
      ? campaign.senderName
        ? `${campaign.senderName} <${campaign.fromEmail}>`
        : campaign.fromEmail
      : creds.senderName
        ? `${creds.senderName} <${creds.senderEmail}>`
        : creds.senderEmail;

    const chunks = chunk(recipients, BATCH_SIZE);
    let successCount = 0;
    let failureCount = 0;

    for (const group of chunks) {
      const emails = group.map((r) => {
        const personalized = personalize(campaign.htmlContent, {
          firstName: r.name.split(" ")[0] || r.name,
          platformName: branding.platformName,
        });
        return {
          from,
          to: r.email,
          subject: campaign.subject,
          html: wrapEmailHtml(personalized, branding),
          ...(campaign.replyTo ? { replyTo: campaign.replyTo } : {}),
        };
      });

      const results = await sendChunkWithRetry(resend, emails);

      await prisma.$transaction(
        results.map((result) => {
          const recipient = group[result.index];
          return prisma.emailCampaignRecipient.update({
            where: { campaignId_email: { campaignId, email: recipient.email } },
            data: result.messageId
              ? { sendStatus: "SENT", resendMessageId: result.messageId, sentAt: new Date() }
              : { sendStatus: "FAILED", errorMessage: result.error },
          });
        }),
      );

      successCount += results.filter((r) => r.messageId).length;
      failureCount += results.filter((r) => r.error).length;
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: failureCount > 0 && successCount === 0 ? "FAILED" : "SENT",
        sentAt: new Date(),
      },
    });

    return { ok: true };
  } catch (e) {
    await prisma.emailCampaign.update({ where: { id: campaignId }, data: { status: "FAILED" } });
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error sending campaign." };
  }
}

export async function sendTestEmail(
  campaign: Pick<EmailCampaign, "subject" | "htmlContent" | "senderName" | "fromEmail" | "replyTo">,
  testAddresses: string[],
): Promise<{ ok: boolean; error?: string }> {
  const creds = await getResendCredentials();
  if (!creds) return { ok: false, error: "Resend is not configured in Admin Settings." };

  const branding = await getBranding();
  const resend = new Resend(creds.apiKey);
  const from = campaign.fromEmail
    ? campaign.senderName
      ? `${campaign.senderName} <${campaign.fromEmail}>`
      : campaign.fromEmail
    : creds.senderName
      ? `${creds.senderName} <${creds.senderEmail}>`
      : creds.senderEmail;

  const html = wrapEmailHtml(
    personalize(campaign.htmlContent, { firstName: "Test", platformName: branding.platformName }),
    branding,
  );

  try {
    const res = await resend.emails.send({
      from,
      to: testAddresses,
      subject: `[TEST] ${campaign.subject}`,
      html,
      ...(campaign.replyTo ? { replyTo: campaign.replyTo } : {}),
    });
    if (res.error) return { ok: false, error: res.error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to send test email." };
  }
}
