import { redirect } from "next/navigation";
import { resolvePostLoginPath } from "@/lib/auth";

// Landing spot for the generic /login form right after Supabase auth
// succeeds. Exists so the login page never has to hard-code a destination —
// role/membership resolution happens once, server-side, in auth.ts.
export default async function PostLoginPage() {
  redirect(await resolvePostLoginPath());
}
