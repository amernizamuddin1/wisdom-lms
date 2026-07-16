"use client";

import { useState } from "react";
import { exportEnrollmentsCsv } from "./actions";
import { Button } from "@/components/ui/button";
import type { EnrollmentReportParams } from "./queries";

function triggerCsvDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DownloadCsvButton({ params }: { params: EnrollmentReportParams }) {
  const [pending, setPending] = useState(false);

  async function handleDownload() {
    setPending(true);
    try {
      const csv = await exportEnrollmentsCsv(params);
      triggerCsvDownload(csv, `enrollment-report-${new Date().toISOString().slice(0, 10)}.csv`);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleDownload} disabled={pending}>
      {pending ? "Preparing CSV..." : "Download CSV"}
    </Button>
  );
}
