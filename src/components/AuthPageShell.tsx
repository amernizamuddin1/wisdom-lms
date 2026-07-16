"use client";

import Image from "next/image";
import { GraduationCapIcon } from "lucide-react";
import { useBranding } from "@/components/BrandingProvider";
import ThemeToggle from "@/components/ThemeToggle";

// Shared input/button treatment so the login, admin login, and register
// forms stay visually identical without copy-pasting the same long
// className strings into each page.
export const authInputClassName =
  "h-[46px] rounded-[11px] border-[rgba(15,23,42,0.10)] bg-white px-3.5 text-[15px] shadow-none transition-[border-color,box-shadow] duration-150 focus-visible:border-[#7C3AED] focus-visible:ring-[3px] focus-visible:ring-[rgba(124,58,237,0.15)] dark:border-white/10 dark:bg-white/[0.03] dark:focus-visible:border-[#7C3AED]";

export const authPasswordInputClassName = `${authInputClassName} pr-11`;

export const authSubmitButtonClassName =
  "h-[47px] w-full rounded-[11px] border-0 bg-[linear-gradient(135deg,#7C3AED_0%,#8B5CF6_50%,#6366F1_100%)] text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.30)] transition-[filter,transform,box-shadow] duration-150 hover:brightness-[1.06] hover:shadow-[0_6px_18px_rgba(124,58,237,0.38)] active:brightness-95 focus-visible:ring-[3px] focus-visible:ring-[rgba(124,58,237,0.35)] disabled:opacity-60";

export const authLinkClassName =
  "font-medium text-[#7C3AED] transition-colors hover:text-[#6D28D9] hover:underline dark:text-[#A78BFA] dark:hover:text-[#C4B5FD]";

// Shared premium chrome (background, brand mark, card, theme toggle) for
// every auth page — student login, admin login, register, etc. Only the
// heading text and form content differ per page.
export default function AuthPageShell({
  heading,
  subheading,
  children,
}: {
  heading: string;
  subheading: string;
  children: React.ReactNode;
}) {
  const branding = useBranding();

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#FAFAFC] px-5 py-10 dark:bg-[#0D0E12] sm:px-6">
      <div className="fixed top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Decorative background — purely visual, never announced to assistive tech */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -left-24 size-[26rem] rounded-full blur-3xl motion-safe:animate-[login-drift-1_20s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0) 70%)",
          }}
        />
        <div
          className="absolute -right-32 top-1/3 size-[30rem] rounded-full blur-3xl motion-safe:animate-[login-drift-2_25s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, rgba(139,92,246,0.10) 0%, rgba(139,92,246,0) 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 left-1/4 size-[28rem] rounded-full blur-3xl motion-safe:animate-[login-drift-3_22s_ease-in-out_infinite]"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0) 70%)",
          }}
        />
        <div
          className="absolute -top-32 -left-24 hidden size-[26rem] rounded-full blur-3xl motion-safe:animate-[login-drift-1_20s_ease-in-out_infinite] dark:block"
          style={{
            background:
              "radial-gradient(circle, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0) 70%)",
          }}
        />
        <div
          className="absolute -right-32 top-1/3 hidden size-[30rem] rounded-full blur-3xl motion-safe:animate-[login-drift-2_25s_ease-in-out_infinite] dark:block"
          style={{
            background:
              "radial-gradient(circle, rgba(109,40,217,0.12) 0%, rgba(109,40,217,0) 70%)",
          }}
        />
        <div
          className="absolute -bottom-40 left-1/4 hidden size-[28rem] rounded-full blur-3xl motion-safe:animate-[login-drift-3_22s_ease-in-out_infinite] dark:block"
          style={{
            background:
              "radial-gradient(circle, rgba(79,70,229,0.10) 0%, rgba(79,70,229,0) 70%)",
          }}
        />
      </div>

      <div className="relative w-full max-w-[420px] motion-safe:animate-[login-card-in_500ms_ease-out]">
        <div className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-[rgba(255,255,255,0.90)] p-8 shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-white/[0.08] dark:bg-[#171820] dark:shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col items-center text-center">
            <div className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-[rgba(124,58,237,0.15)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-[rgba(124,58,237,0.25)] dark:bg-[#1D1E29] dark:shadow-[0_0_20px_rgba(124,58,237,0.15)]">
              {branding.logoUrl ? (
                <Image
                  src={branding.logoUrl}
                  alt={branding.platformName}
                  width={28}
                  height={28}
                  className="size-7 object-contain"
                  unoptimized
                />
              ) : (
                <GraduationCapIcon className="size-6 text-[#7C3AED]" />
              )}
            </div>

            <h1 className="text-[26px] leading-tight font-semibold text-foreground">{heading}</h1>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">{subheading}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
