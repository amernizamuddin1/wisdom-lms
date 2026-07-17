import "./env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// One-off fixup: the seeded Demo Academy tenant's `subdomain` is
// "demo-academy" (hyphenated), but the actual staging DNS/Vercel domain
// configured for it is "demoacademy.staging.wisdomquant.com" (no hyphen).
// extractSubdomain() does an exact string match, so this mismatch would make
// the real staging host resolve to nothing (404) despite DNS being valid.
// Guarded by ./env (staging-only, production hard-blocked).
async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const db = new PrismaClient({ adapter });

  const tenants = await db.tenant.findMany({
    where: { id: { in: ["00000000-0000-0000-0000-000000000001", "00000000-0000-0000-0000-000000000002"] } },
  });
  console.log("[staging] Current tenant subdomains:", tenants.map((t) => ({ slug: t.slug, subdomain: t.subdomain, primaryDomain: t.primaryDomain })));

  const demoAcademy = tenants.find((t) => t.slug === "demo-academy");
  if (!demoAcademy) throw new Error("Demo Academy tenant not found");

  if (demoAcademy.subdomain !== "demoacademy") {
    const updated = await db.tenant.update({
      where: { id: demoAcademy.id },
      data: { subdomain: "demoacademy" },
    });
    console.log(`[staging] Fixed Demo Academy subdomain: "${demoAcademy.subdomain}" -> "${updated.subdomain}"`);
  } else {
    console.log("[staging] Demo Academy subdomain already correct, no change.");
  }

  const wisdomQuant = tenants.find((t) => t.slug === "wisdomquant");
  if (!wisdomQuant) throw new Error("WisdomQuant tenant not found");
  console.log(`[staging] WisdomQuant subdomain: "${wisdomQuant.subdomain}" (expected "wisdomquant") -> ${wisdomQuant.subdomain === "wisdomquant" ? "OK" : "MISMATCH"}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
