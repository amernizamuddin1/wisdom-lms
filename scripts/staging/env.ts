// Shared entry point for every staging CLI script (seed/verify/migrate).
// Loads the local-only staging env file and hard-fails unless DATABASE_URL
// and DIRECT_URL resolve to either a local database (localhost/127.0.0.1) or
// the known Supabase STAGING project ref. The production project ref is
// explicitly blocked even if it would otherwise match a recognized
// connection-string shape — this is the guard against ever accidentally
// running staging scripts against the real Supabase database.
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

const ENV_PATH = path.resolve(__dirname, "../../.env.staging.local");
const GITIGNORE_PATH = path.resolve(__dirname, "../../.gitignore");

export const STAGING_PROJECT_REF = "wxhesjgjlufjwwtahqsu";
export const PRODUCTION_PROJECT_REF = "peqzxcbtawpvijzllkdw";

dotenv.config({ path: ENV_PATH, override: true });

function redact(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.replace(/^postgres(ql)?:/, "http:"));
    const user = u.username ? u.username.replace(/^(.{4}).*$/, "$1***") : "";
    return `${user}@${u.hostname}${u.pathname}`;
  } catch {
    return "<unparseable>";
  }
}

// Pooled Supabase connections carry the project ref in the username
// ("postgres.<ref>"); direct connections carry it in the hostname
// ("db.<ref>.supabase.co"). Both are checked since either shape is valid.
function extractProjectRef(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.replace(/^postgres(ql)?:/, "http:"));
  } catch {
    return null;
  }
  const userMatch = parsed.username.match(/^postgres\.([a-z0-9]+)$/);
  if (userMatch) return userMatch[1];
  const hostMatch = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/);
  if (hostMatch) return hostMatch[1];
  return null;
}

function checkUrl(name: string, rawUrl: string | undefined): void {
  if (!rawUrl) {
    throw new Error(
      `${name} is not set. Expected .env.staging.local to exist at the repo root ` +
        "(see docs/multi-tenancy.md's staging validation section).",
    );
  }

  let host: string;
  try {
    host = new URL(rawUrl.replace(/^postgres(ql)?:/, "http:")).hostname;
  } catch {
    throw new Error(`Could not parse ${name} to check its host: ${redact(rawUrl)}`);
  }

  if (host === "localhost" || host === "127.0.0.1") {
    console.log(`[staging] ${name} -> local database at ${host} (guard passed).`);
    return;
  }

  const ref = extractProjectRef(rawUrl);

  if (ref === PRODUCTION_PROJECT_REF) {
    throw new Error(
      `Refusing to run: ${name} points at the PRODUCTION Supabase project ` +
        `(${PRODUCTION_PROJECT_REF}, ${redact(rawUrl)}). Staging scripts must never run against production.`,
    );
  }

  if (!ref) {
    throw new Error(
      `Refusing to run: could not determine a Supabase project ref from ${name} (${redact(rawUrl)}). ` +
        "Staging scripts must target either localhost/127.0.0.1 or the known staging project ref.",
    );
  }

  if (ref !== STAGING_PROJECT_REF) {
    throw new Error(
      `Refusing to run: ${name} points at an unrecognized Supabase project ref "${ref}" (${redact(rawUrl)}). ` +
        `Only the staging project (${STAGING_PROJECT_REF}) is allowed.`,
    );
  }

  console.log(`[staging] ${name} -> Supabase STAGING project ${STAGING_PROJECT_REF} (${redact(rawUrl)}) (guard passed).`);
}

checkUrl("DATABASE_URL", process.env.DATABASE_URL);
checkUrl("DIRECT_URL", process.env.DIRECT_URL);

// Supabase Storage/Auth admin calls go over the REST API URL, not the Postgres
// connection strings above, so it needs its own ref check: the hostname shape
// here is "<ref>.supabase.co" (no "db." prefix, no username-embedded ref).
export function checkSupabaseApiUrl(name: string, rawUrl: string | undefined): void {
  if (!rawUrl) {
    throw new Error(`${name} is not set. Expected .env.staging.local to define it.`);
  }

  let hostname: string;
  try {
    hostname = new URL(rawUrl).hostname;
  } catch {
    throw new Error(`Could not parse ${name} as a URL: ${redact(rawUrl)}`);
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    console.log(`[staging] ${name} -> local Supabase at ${hostname} (guard passed).`);
    return;
  }

  const match = hostname.match(/^([a-z0-9]+)\.supabase\.co$/);
  const ref = match ? match[1] : null;

  if (ref === PRODUCTION_PROJECT_REF) {
    throw new Error(
      `Refusing to run: ${name} points at the PRODUCTION Supabase project ` +
        `(${PRODUCTION_PROJECT_REF}, ${redact(rawUrl)}). Staging scripts must never run against production.`,
    );
  }

  if (ref !== STAGING_PROJECT_REF) {
    throw new Error(
      `Refusing to run: ${name} points at an unrecognized Supabase project ref "${ref}" (${redact(rawUrl)}). ` +
        `Only the staging project (${STAGING_PROJECT_REF}) is allowed.`,
    );
  }

  console.log(`[staging] ${name} -> Supabase STAGING project ${STAGING_PROJECT_REF} (${redact(rawUrl)}) (guard passed).`);
}

checkSupabaseApiUrl("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);

let gitignoreOk = false;
try {
  const gitignore = fs.readFileSync(GITIGNORE_PATH, "utf8");
  gitignoreOk = gitignore
    .split(/\r?\n/)
    .some((line) => {
      const pattern = line.trim();
      return pattern === ".env*" || pattern === ".env.staging.local";
    });
} catch {
  gitignoreOk = false;
}

if (!gitignoreOk) {
  throw new Error(
    ".env.staging.local does not appear to be covered by .gitignore (expected a \".env*\" or " +
      "\".env.staging.local\" pattern). Refusing to run until it's confirmed to be untracked.",
  );
}
console.log("[staging] .env.staging.local is covered by .gitignore (confirmed).");
console.log("[staging] Both DATABASE_URL and DIRECT_URL confirmed pointed at staging, not production.");
