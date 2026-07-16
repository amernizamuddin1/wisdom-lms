import "server-only";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { getTenantId } from "@/lib/tenant-context";

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

// Returns null (never throws) if Razorpay isn't fully configured yet, so callers
// can gate "is checkout even available" without a try/catch at every call site.
export async function getRazorpayCredentials(): Promise<RazorpayCredentials | null> {
  const tenantId = await getTenantId();
  const settings = await prisma.settings.findUnique({ where: { tenantId } });

  if (
    !settings?.razorpayKeyIdEncrypted ||
    !settings.razorpayKeySecretEncrypted ||
    !settings.razorpayWebhookSecretEncrypted
  ) {
    return null;
  }

  try {
    return {
      keyId: decrypt(settings.razorpayKeyIdEncrypted),
      keySecret: decrypt(settings.razorpayKeySecretEncrypted),
      webhookSecret: decrypt(settings.razorpayWebhookSecretEncrypted),
    };
  } catch {
    // Corrupt ciphertext (e.g. MASTER_ENCRYPTION_KEY rotated without re-entering
    // secrets) — treat as "not configured" rather than crashing checkout.
    return null;
  }
}

export interface ResendCredentials {
  apiKey: string;
  senderEmail: string;
  senderName: string | null;
}

// Returns null (never throws) if Resend isn't fully configured yet, so email
// call sites can no-op instead of failing the request they're attached to.
export async function getResendCredentials(): Promise<ResendCredentials | null> {
  const tenantId = await getTenantId();
  const settings = await prisma.settings.findUnique({ where: { tenantId } });

  if (!settings?.resendApiKeyEncrypted || !settings.resendSenderEmail) {
    return null;
  }

  try {
    return {
      apiKey: decrypt(settings.resendApiKeyEncrypted),
      senderEmail: settings.resendSenderEmail,
      senderName: settings.resendSenderName,
    };
  } catch {
    return null;
  }
}
