// Shared entry point for every staging CLI script (seed/verify). Loads the
// local-only staging env file and hard-fails if DATABASE_URL doesn't point
// at localhost — this is the guard against ever accidentally running staging
// scripts against the real Supabase database.
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env.staging.local"), override: true });

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Expected .env.staging.local to exist at the repo root " +
      "(see docs/multi-tenancy.md's staging validation section) — run `npx prisma dev` first.",
  );
}

let host: string;
try {
  host = new URL(url.replace(/^postgres(ql)?:/, "http:")).hostname;
} catch {
  throw new Error(`Could not parse DATABASE_URL to check its host: ${url}`);
}

if (host !== "localhost" && host !== "127.0.0.1") {
  throw new Error(
    `Refusing to run: DATABASE_URL host is "${host}", not localhost/127.0.0.1. ` +
      "Staging scripts must never run against a non-local database.",
  );
}

console.log(`[staging] Using local database at ${host} (guard passed).`);
