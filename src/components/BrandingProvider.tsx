"use client";

import { createContext, useContext } from "react";
import type { Branding } from "@/lib/branding";

const BrandingContext = createContext<Branding | null>(null);

export function BrandingProvider({
  branding,
  children,
}: {
  branding: Branding;
  children: React.ReactNode;
}) {
  return <BrandingContext.Provider value={branding}>{children}</BrandingContext.Provider>;
}

// Server components should call getBranding() directly instead of this hook.
export function useBranding(): Branding {
  const branding = useContext(BrandingContext);
  if (!branding) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return branding;
}
