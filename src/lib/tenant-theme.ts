import "server-only";

// Central theme definition for the WisdomQuant tenant, extracted from the
// WisdomQuant marketing site (public/css/styles.css in the separate
// "WisdomQuant Website" project — the source of truth, not modified by
// this app). Injected as a scoped <style> override in the root layout
// ONLY when the resolved tenant is WisdomQuant (see src/app/layout.tsx) —
// every other tenant keeps the default "Wisdom Indigo" palette defined in
// globals.css untouched.
export const WISDOMQUANT_TENANT_SLUG = "wisdomquant";

export const WISDOMQUANT_SITE_URL = "https://www.wisdomquant.com";

export const wisdomQuantThemeCss = `
  :root {
    /* Tailwind v4 bakes --default-font-family as a direct reference to
       --font-inter (not to --font-sans) at build time, so both must be
       overridden here for Poppins to actually apply to html/body. */
    --font-sans: var(--font-poppins);
    --font-body: var(--font-poppins);
    --default-font-family: var(--font-poppins);

    --background: #f3f8ff;
    --background-page: #f8fcff;
    --card: #ffffff;
    --card-foreground: #101a3d;
    --foreground: #101a3d;
    --popover: #ffffff;
    --popover-foreground: #101a3d;

    --primary: #005bff;
    --primary-hover: #0a64ff;
    --primary-pressed: #0047cc;
    --primary-foreground: #ffffff;
    --text-brand: #005bff;
    --indigo: #005bff;
    --sidebar-primary: #005bff;

    --secondary: #eff6fe;
    --secondary-foreground: #005bff;

    --accent: #2faaff;
    --accent-hover: #1f96ea;
    --accent-foreground: #ffffff;
    --accent-soft: #eaf4ff;

    --muted: #f4f7fd;
    --muted-foreground: #65749a;
    --surface-secondary: #f4f7fd;
    --surface-tertiary: #e7f0fc;
    --surface-brand-subtle: #eff6fe;
    --text-tertiary: #65749a;

    --border: #d7e5f8;
    --border-strong: #b9d2f2;
    --border-subtle: #e7f0fc;
    --card-border: #a9cbfa;
    --input: #d7e5f8;
    --ring: #2faaff;

    --sidebar: #ffffff;
    --sidebar-foreground: #101a3d;
    --sidebar-accent: #eff6fe;
    --sidebar-accent-foreground: #005bff;
    --sidebar-border: #d7e5f8;
    --sidebar-ring: #2faaff;

    --radius: 1.125rem;
    --card-shadow: none;
    --header-height: 4.75rem;
    --content-width: 82.5rem;

    /* Auth shell (login/register/forgot/reset) — see AuthPageShell.tsx */
    --auth-accent: #005bff;
    --auth-focus-color: #005bff;
    --auth-focus-ring: rgba(0, 91, 255, 0.15);
    --auth-focus-ring-strong: rgba(0, 91, 255, 0.35);
    --auth-button-bg: linear-gradient(135deg, #005bff 0%, #0a64ff 50%, #2faaff 100%);
    --auth-button-shadow: 0 4px 14px rgba(0, 91, 255, 0.3);
    --auth-button-shadow-hover: 0 6px 18px rgba(0, 91, 255, 0.38);
    --auth-icon-color: #005bff;
    --auth-icon-border: rgba(0, 91, 255, 0.15);
    --auth-icon-border-dark: rgba(47, 170, 255, 0.25);
    --auth-icon-glow-dark: rgba(47, 170, 255, 0.15);
    --auth-link-color: #005bff;
    --auth-link-hover: #0047cc;
    --auth-link-color-dark: #6fa4ff;
    --auth-link-hover-dark: #9bc4ff;
    --auth-glow-rgb: 0, 91, 255;
  }

  .dark {
    --background: #080c30;
    --background-page: #070b3f;
    --card: #10143f;
    --card-foreground: #f3f5ff;
    --foreground: #f3f5ff;
    --popover: #10143f;
    --popover-foreground: #f3f5ff;

    --primary: #4c8dff;
    --primary-hover: #6fa4ff;
    --primary-pressed: #2f74e6;
    --primary-foreground: #061024;
    --text-brand: #6fa4ff;
    --indigo: #4c8dff;
    --sidebar-primary: #4c8dff;

    --secondary: #141a4a;
    --secondary-foreground: #aeb6de;

    --accent: #6fa4ff;
    --accent-hover: #8fb8ff;
    --accent-foreground: #061024;
    --accent-soft: #16224f;

    --muted: #141a4a;
    --muted-foreground: #aeb6de;
    --surface-secondary: #141a4a;
    --surface-tertiary: #1c2456;
    --surface-brand-subtle: #16224f;
    --text-tertiary: #9ba3cc;

    --border: #1c2456;
    --border-strong: #2a2f66;
    --border-subtle: #161b45;
    --card-border: #2f4d99;
    --input: #1c2456;
    --ring: #6fa4ff;

    --sidebar: #070b3f;
    --sidebar-foreground: #f3f5ff;
    --sidebar-accent: #16224f;
    --sidebar-accent-foreground: #aeb6de;
    --sidebar-border: #1c2456;
    --sidebar-ring: #6fa4ff;

    --card-shadow: none;

    --auth-accent: #6fa4ff;
    --auth-focus-color: #6fa4ff;
    --auth-focus-ring: rgba(111, 164, 255, 0.18);
    --auth-focus-ring-strong: rgba(111, 164, 255, 0.35);
    --auth-button-bg: linear-gradient(135deg, #2f74e6 0%, #4c8dff 50%, #6fa4ff 100%);
    --auth-button-shadow: 0 4px 14px rgba(76, 141, 255, 0.35);
    --auth-button-shadow-hover: 0 6px 18px rgba(76, 141, 255, 0.45);
    --auth-icon-color: #6fa4ff;
    --auth-glow-rgb: 76, 141, 255;
  }
`;
