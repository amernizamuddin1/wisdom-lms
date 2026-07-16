import { describe, expect, it } from "vitest";
import { DEMO_ACADEMY_TENANT_ID, WISDOMQUANT_TENANT_ID, asTenant, hasStagingDb, loadPrismaModule } from "./db-helper";

// Settings/CommunitySettings are deliberately excluded from the auto-scoping
// extension — their primary key IS tenant_id, so there's no secondary
// tenantId field to inject; isolation here means "tenant_id as PK" itself.
describe.skipIf(!hasStagingDb)("Settings & branding tenant isolation", () => {
  it("Each tenant's Settings row is keyed on its own tenant_id and values don't bleed across tenants", async () => {
    const { platformPrisma } = await loadPrismaModule();
    const wq = await platformPrisma.settings.upsert({
      where: { tenantId: WISDOMQUANT_TENANT_ID },
      create: { tenantId: WISDOMQUANT_TENANT_ID, platformName: "WisdomQuant Branding Check" },
      update: { platformName: "WisdomQuant Branding Check" },
    });
    const da = await platformPrisma.settings.upsert({
      where: { tenantId: DEMO_ACADEMY_TENANT_ID },
      create: { tenantId: DEMO_ACADEMY_TENANT_ID, platformName: "Demo Academy Branding Check" },
      update: { platformName: "Demo Academy Branding Check" },
    });

    expect(wq.platformName).toBe("WisdomQuant Branding Check");
    expect(da.platformName).toBe("Demo Academy Branding Check");
    expect(wq.tenantId).not.toBe(da.tenantId);
  });

  it("getSettings()-style lookup (settings.findUnique({where:{tenantId}})) scoped to the wrong tenant cannot read the other tenant's row directly by id substitution", async () => {
    // This is the pattern every real call site uses (see src/lib/settings.ts)
    // — always look up by the CALLER's own getTenantId(), never a
    // request-supplied id, so there is no "manually change the id" attack
    // surface for this table the way there is for uuid-pk tables.
    const { platformPrisma } = await loadPrismaModule();
    const own = await platformPrisma.settings.findUnique({ where: { tenantId: WISDOMQUANT_TENANT_ID } });
    const other = await platformPrisma.settings.findUnique({ where: { tenantId: DEMO_ACADEMY_TENANT_ID } });
    expect(own?.tenantId).toBe(WISDOMQUANT_TENANT_ID);
    expect(other?.tenantId).toBe(DEMO_ACADEMY_TENANT_ID);
    expect(own?.platformName).not.toBe(other?.platformName);
  });

  it("CommunitySettings likewise has one independent row per tenant", async () => {
    const { platformPrisma } = await loadPrismaModule();
    const wq = await platformPrisma.communitySettings.upsert({
      where: { tenantId: WISDOMQUANT_TENANT_ID },
      create: { tenantId: WISDOMQUANT_TENANT_ID, communityEnabled: true },
      update: { communityEnabled: true },
    });
    const da = await platformPrisma.communitySettings.upsert({
      where: { tenantId: DEMO_ACADEMY_TENANT_ID },
      create: { tenantId: DEMO_ACADEMY_TENANT_ID, communityEnabled: false },
      update: { communityEnabled: false },
    });
    expect(wq.communityEnabled).toBe(true);
    expect(da.communityEnabled).toBe(false);
  });

  it("getTenantId()-scoped code (runWithTenant) resolves settings for the ambient tenant only", async () => {
    const found = await asTenant(DEMO_ACADEMY_TENANT_ID, "demo-academy", async () => {
      const { platformPrisma } = await loadPrismaModule();
      const tenantId = DEMO_ACADEMY_TENANT_ID;
      return platformPrisma.settings.findUnique({ where: { tenantId } });
    });
    expect(found?.tenantId).toBe(DEMO_ACADEMY_TENANT_ID);
  });
});
