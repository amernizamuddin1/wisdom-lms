// Read-only check: shows pending/applied migration status against STAGING
// only. Same safety guard as migrate.ts (./env), but never mutates schema.
import "./env";
import { spawnSync } from "child_process";

console.log("[staging] Checking `prisma migrate status` against staging...");

const result = spawnSync("npx", ["prisma", "migrate", "status"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
