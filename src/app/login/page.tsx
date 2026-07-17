"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useBranding } from "@/components/BrandingProvider";
import AuthPageShell, {
  authInputClassName,
  authPasswordInputClassName,
  authSubmitButtonClassName,
  authLinkClassName,
} from "@/components/AuthPageShell";

const NO_ACCESS_MESSAGE =
  "Your account does not have access to this organisation. Please use the correct organisation login address.";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branding = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "no_access" ? NO_ACCESS_MESSAGE : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/post-login");
    router.refresh();
  }

  return (
    <AuthPageShell
      heading={`Log in to ${branding.platformName}`}
      subheading="Welcome back. Continue your learning journey."
    >
      <form onSubmit={handleSubmit} className="mt-7 space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-[13.5px] font-medium">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClassName}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-[13.5px] font-medium">
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authPasswordInputClassName}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(124,58,237,0.15)]"
            >
              {showPassword ? (
                <EyeOffIcon className="size-4" aria-hidden="true" />
              ) : (
                <EyeIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" disabled={loading} className={authSubmitButtonClassName}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>

        <div className="space-y-2 pt-1 text-center text-sm">
          <p>
            <Link href="/login/forgot-password" className={authLinkClassName}>
              Forgot your password?
            </Link>
          </p>
          <p className="text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className={authLinkClassName}>
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
