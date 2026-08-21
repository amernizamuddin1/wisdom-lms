import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getBranding } from "@/lib/branding";
import { getAnalyticsSettings } from "@/lib/analytics/settings";
import { getTenantId } from "@/lib/tenant-context";
import LogoUploader from "./LogoUploader";
import BrandingSettingsForm from "./BrandingSettingsForm";
import CertificateTemplateForm from "./CertificateTemplateForm";
import IntegrationSettingsForm from "./IntegrationSettingsForm";
import AnalyticsSettingsForm from "./AnalyticsSettingsForm";
import DeleteAccountForm from "./DeleteAccountForm";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const tenantId = await getTenantId();

  const [settings, branding, analyticsSettings] = await Promise.all([
    prisma.settings.findUnique({ where: { tenantId } }),
    getBranding(),
    getAnalyticsSettings(),
  ]);

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage branding and payment gateway credentials. Encrypted values are never displayed
          again once saved.
        </p>
      </div>

      <LogoUploader logoUrl={settings?.logoUrl ?? null} />

      <BrandingSettingsForm branding={branding} faviconUrl={settings?.faviconUrl ?? null} />

      <CertificateTemplateForm hasTemplate={Boolean(settings?.certificateTemplateHtml)} />

      <AnalyticsSettingsForm settings={analyticsSettings} />

      <IntegrationSettingsForm
        keyIdConfigured={Boolean(settings?.razorpayKeyIdEncrypted)}
        keySecretConfigured={Boolean(settings?.razorpayKeySecretEncrypted)}
        webhookSecretConfigured={Boolean(settings?.razorpayWebhookSecretEncrypted)}
        resendApiKeyConfigured={Boolean(settings?.resendApiKeyEncrypted)}
        resendSenderEmail={settings?.resendSenderEmail ?? null}
        resendSenderName={settings?.resendSenderName ?? null}
      />

      <DeleteAccountForm />
    </div>
  );
}
