"use client";

import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DownloadCsvButton({
  action,
  filenamePrefix,
}: {
  action: () => Promise<string>;
  filenamePrefix: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleDownload() {
    setPending(true);
    try {
      const csv = await action();
      triggerCsvDownload(csv, `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleDownload} disabled={pending} className="gap-1.5">
      <DownloadIcon className="size-4" />
      {pending ? "Preparing..." : "Export CSV"}
    </Button>
  );
}
