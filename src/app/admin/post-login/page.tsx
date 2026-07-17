import { redirect } from "next/navigation";
import { resolvePostLoginPath } from "@/lib/auth";

// Landing spot for the admin login form right after Supabase auth succeeds —
// mirrors src/app/post-login/page.tsx, but keeps a non-admin/no-membership
// caller on the admin login form (with an explanatory error) instead of the
// student one.
export default async function AdminPostLoginPage() {
  redirect(await resolvePostLoginPath("/admin/login"));
}
