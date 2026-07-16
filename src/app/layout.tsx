import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import AppToaster from "@/components/AppToaster";
import { BrandingProvider } from "@/components/BrandingProvider";
import { getBranding } from "@/lib/branding";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  const branding = await getBranding();

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
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
        `}</style>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrandingProvider branding={branding}>
            {children}
            <AppToaster />
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
