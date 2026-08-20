import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { ThemeProvider } from "next-themes";
import AppToaster from "@/components/AppToaster";
import { BrandingProvider } from "@/components/BrandingProvider";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { getBranding } from "@/lib/branding";
import { getOptionalTenantContext } from "@/lib/tenant-context";
import { WISDOMQUANT_TENANT_SLUG, wisdomQuantThemeCss } from "@/lib/tenant-theme";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Only loaded/served for the WisdomQuant tenant (see wisdomQuantThemeCss
// below, which points --font-sans at this variable) — every other tenant
// keeps Inter as --font-sans.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.platformName,
    description: `Learning management platform for ${branding.platformName} courses.`,
    icons: branding.faviconUrl ? { icon: branding.faviconUrl } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [branding, tenant] = await Promise.all([getBranding(), getOptionalTenantContext()]);
  const isWisdomQuant = tenant?.tenantSlug === WISDOMQUANT_TENANT_SLUG;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <style>{`
          :root {
            --primary: ${branding.primaryColor};
            --text-brand: ${branding.primaryColor};
            --indigo: ${branding.primaryColor};
            --sidebar-primary: ${branding.primaryColor};
          }
          .dark {
            --primary: ${branding.darkPrimaryColor};
            --text-brand: ${branding.darkPrimaryColor};
            --indigo: ${branding.darkPrimaryColor};
            --sidebar-primary: ${branding.darkPrimaryColor};
          }
          ${isWisdomQuant ? wisdomQuantThemeCss : ""}
        `}</style>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider branding={branding}>
            {children}
            <AppToaster />
            <WebVitalsReporter />
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
