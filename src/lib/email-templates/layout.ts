import type { Branding } from "@/lib/branding";

// Wraps sanitized campaign body HTML in a table-based, email-client-safe
// shell (max-width container, inline styles only — no external stylesheet,
// since most email clients strip <style> or ignore classes). Branding is
// baked in from the active white-label settings, with the same fallback
// defaults getBranding() already provides.
export function wrapEmailHtml(bodyHtml: string, branding: Branding): string {
  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${escapeAttr(branding.platformName)}" height="32" style="height:32px;width:auto;display:block;" />`
    : `<span style="font-size:20px;font-weight:700;color:${branding.primaryColor};">${escapeHtml(branding.platformName)}</span>`;

  const footerText =
    branding.footerText ||
    `&copy; ${new Date().getFullYear()} ${escapeHtml(branding.platformName)}. All rights reserved.`;

  const supportLine = branding.supportEmail
    ? `<p style="margin:4px 0 0;font-size:12px;color:#8a8f98;">Questions? Contact <a href="mailto:${branding.supportEmail}" style="color:${branding.primaryColor};">${branding.supportEmail}</a></p>`
    : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background-color:#f4f5f7;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f5f7;padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:92vw;background-color:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px 32px;border-bottom:1px solid #eceef2;">${logo}</td>
            </tr>
            <tr>
              <td style="padding:32px;color:#181a20;font-size:15px;line-height:1.6;">
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;border-top:1px solid #eceef2;text-align:center;">
                <p style="margin:0;font-size:12px;color:#8a8f98;">${footerText}</p>
                ${supportLine}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}

// CTA button markup the email editor inserts — plain, email-safe (no
// flexbox/grid), styled with the active brand color.
export function ctaButtonHtml(label: string, url: string, primaryColor: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;"><tr><td style="border-radius:8px;background-color:${primaryColor};"><a href="${url}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(label)}</a></td></tr></table>`;
}
