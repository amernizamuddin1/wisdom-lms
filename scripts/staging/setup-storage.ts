// Idempotent Supabase Storage bucket provisioning for the STAGING project
// only. Safe to rerun: existing buckets are left completely untouched (their
// settings are only reported, never modified), and only missing buckets are
// created. Guarded by ./env, which hard-blocks the production project ref
// for both the Postgres connection strings and NEXT_PUBLIC_SUPABASE_URL.
//
// This mirrors the bucket list in the top-level scripts/setup-storage.ts but
// adds the staging-only production-ref guard plus fileSizeLimit/
// allowedMimeTypes hardening that script never had.
import "./env";
import { createClient } from "@supabase/supabase-js";
import { STAGING_PROJECT_REF } from "./env";
import {
  CERTIFICATES_BUCKET,
  COURSE_ASSETS_BUCKET,
  LESSON_FILES_BUCKET,
} from "@/lib/storage/paths";

interface BucketSpec {
  name: string;
  public: boolean;
  fileSizeLimit: string;
  allowedMimeTypes: string[] | undefined;
}

const REQUIRED_BUCKETS: BucketSpec[] = [
  {
    name: COURSE_ASSETS_BUCKET,
    public: true,
    fileSizeLimit: "5MB",
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
  {
    name: LESSON_FILES_BUCKET,
    public: false,
    // Capped at 50MB: Supabase enforces a project-wide max upload size (this
    // staging project's plan rejects a bucket-level limit above that), so
    // this is the largest value the bucket can actually be created with.
    fileSizeLimit: "50MB",
    allowedMimeTypes: undefined,
  },
  {
    name: CERTIFICATES_BUCKET,
    public: true,
    fileSizeLimit: "10MB",
    allowedMimeTypes: ["application/pdf"],
  },
];

async function main() {
  console.log(`[staging] Provisioning Supabase Storage buckets on project ${STAGING_PROJECT_REF}.\n`);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  });

  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list existing buckets: ${listError.message}`);
  }
  const existingByName = new Map(existingBuckets.map((b) => [b.name, b]));

  const report: { name: string; status: "created" | "already-existed"; public: boolean; fileSizeLimit: string; allowedMimeTypes: string }[] = [];

  for (const spec of REQUIRED_BUCKETS) {
    const existing = existingByName.get(spec.name);
    if (existing) {
      console.log(`[staging] Bucket "${spec.name}" already exists — leaving it unchanged.`);
      report.push({
        name: spec.name,
        status: "already-existed",
        public: existing.public,
        fileSizeLimit: String(existing.file_size_limit ?? "unset"),
        allowedMimeTypes: (existing.allowed_mime_types ?? []).join(", ") || "unset",
      });
      continue;
    }

    const { error: createError } = await supabase.storage.createBucket(spec.name, {
      public: spec.public,
      fileSizeLimit: spec.fileSizeLimit,
      allowedMimeTypes: spec.allowedMimeTypes,
    });
    if (createError) {
      throw new Error(`Failed to create bucket "${spec.name}": ${createError.message}`);
    }
    console.log(`[staging] Created bucket "${spec.name}" (public=${spec.public}, fileSizeLimit=${spec.fileSizeLimit}, allowedMimeTypes=${spec.allowedMimeTypes?.join(", ") ?? "any"}).`);
    report.push({
      name: spec.name,
      status: "created",
      public: spec.public,
      fileSizeLimit: spec.fileSizeLimit,
      allowedMimeTypes: spec.allowedMimeTypes?.join(", ") ?? "any",
    });
  }

  console.log("\n=== Summary ===");
  for (const r of report) {
    console.log(
      `${r.status === "created" ? "CREATED" : "EXISTED"} — ${r.name} (public=${r.public}, fileSizeLimit=${r.fileSizeLimit}, allowedMimeTypes=${r.allowedMimeTypes})`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
