// Applies pending Prisma migrations to the STAGING database only.
//
// `prisma.config.ts` does `import "dotenv/config"` and reads DIRECT_URL for
// migrate/introspection — that import loads the repo-root `.env`, which
// holds PRODUCTION credentials. `./env` (imported first, below) loads
// `.env.staging.local` into process.env with override:true and validates
// both DATABASE_URL and DIRECT_URL are the staging project (never
// production). Spawning the Prisma CLI with that already-populated
// process.env is what keeps it safe: dotenv.config() never overwrites a
// variable that's already set, so `.env`'s production values are ignored by
// the child process.
import "./env";
import { spawnSync } from "child_process";

console.log("[staging] Running `prisma migrate deploy` against staging...");

const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 1);
