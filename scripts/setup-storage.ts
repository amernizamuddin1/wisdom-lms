import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const existing = new Set(buckets.map((b) => b.name));

  const toCreate: { name: string; public: boolean }[] = [
    { name: "course-assets", public: true },
    { name: "lesson-files", public: false },
    { name: "certificates", public: true },
  ];

  for (const bucket of toCreate) {
    if (existing.has(bucket.name)) {
      console.log(`Bucket "${bucket.name}" already exists, skipping.`);
      continue;
    }
    const { error } = await supabase.storage.createBucket(bucket.name, {
      public: bucket.public,
    });
    if (error) throw error;
    console.log(`Created bucket "${bucket.name}" (public=${bucket.public}).`);
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
