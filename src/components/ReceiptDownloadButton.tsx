"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { downloadOrderReceiptAction } from "@/app/dashboard/orders/actions";

function downloadBase64Pdf(base64: string, filename: string) {
  const byteChars = atob(base64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);

  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReceiptDownloadButton({
  orderId,
  variant = "outline",
  size = "sm",
}: {
  orderId: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await downloadOrderReceiptAction(orderId);
      if (result.error || !result.base64 || !result.filename) {
        toast.error(result.error ?? "Couldn't generate the receipt.");
        return;
      }
      downloadBase64Pdf(result.base64, result.filename);
    });
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={pending} onClick={handleClick}>
      {pending ? "Preparing..." : "Download Receipt"}
    </Button>
  );
}
