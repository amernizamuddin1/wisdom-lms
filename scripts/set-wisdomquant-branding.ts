// One-time (idempotent) data update: populate the *existing* WisdomQuant
// tenant's Settings row with its real branding — logo, favicon, platform
// name, and the WQ blue as the fallback primary color (the CSS-level
// override in src/lib/tenant-theme.ts is what actually drives the UI
// colors; this keeps the DB-backed branding.primaryColor consistent for
// any code path that reads it directly, e.g. certificates/emails).
//
// No schema change — Settings.primaryColor/logoUrl/etc. already exist.
// Safe to re-run.
//
// Uses the raw, unscoped client from scripts/staging/db.ts (same pattern as
// scripts/staging/seed-tenant-fixtures.ts) since this tenantId is stamped
// explicitly rather than resolved from a request.
//
// Run with: npx tsx scripts/set-wisdomquant-branding.ts
import { db } from "./staging/db";

const WISDOMQUANT_TENANT_ID = "00000000-0000-0000-0000-000000000001";

async function main() {
  await db.settings.upsert({
    where: { tenantId: WISDOMQUANT_TENANT_ID },
    create: {
      tenantId: WISDOMQUANT_TENANT_ID,
      platformName: "WisdomQuant",
      shortName: "WisdomQuant",
      logoUrl: "/tenant-assets/wisdomquant/wq-logo.png",
      faviconUrl: "/tenant-assets/wisdomquant/wq-favicon.png",
      primaryColor: "#005bff",
      darkPrimaryColor: "#4c8dff",
    },
    update: {
      platformName: "WisdomQuant",
      shortName: "WisdomQuant",
      logoUrl: "/tenant-assets/wisdomquant/wq-logo.png",
      faviconUrl: "/tenant-assets/wisdomquant/wq-favicon.png",
      primaryColor: "#005bff",
      darkPrimaryColor: "#4c8dff",
    },
  });

  console.log("WisdomQuant tenant branding updated.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
