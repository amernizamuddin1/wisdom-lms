// A raw, unscoped Prisma client for staging CLI scripts — equivalent to
// `platformPrisma` in src/lib/prisma.ts, but constructed directly here
// instead of importing that module, since it (via tenant-context.ts) pulls
// in the "server-only" package, which throws outside a Next.js server build
// (see vitest.config.ts's server-only-stub for the same problem in tests).
// Every create/query below must stamp tenantId explicitly — there is no
// auto-scoping extension applied to this client.
import "./env";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
export const db = new PrismaClient({ adapter });
