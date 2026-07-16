"use client";

import { useTheme } from "next-themes";
import { Toaster, type ToasterProps } from "sonner";

export default function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      richColors
      position="top-right"
      theme={resolvedTheme as ToasterProps["theme"]}
    />
  );
}
