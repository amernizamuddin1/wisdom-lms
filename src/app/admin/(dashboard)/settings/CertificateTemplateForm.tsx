"use client";

import { useActionState, useState } from "react";
import { saveCertificateTemplate, type SettingsActionState } from "./actions";
import { renderCertificateHtml } from "@/lib/gamification/certificate-tokens";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActionToast } from "@/hooks/use-action-toast";

const initialState: SettingsActionState = {};

const SAMPLE_DATA = {
  studentName: "Jane Doe",
  courseTitle: "Sample Course",
  completionDate: new Date().toLocaleDateString(),
  certificateCode: "WQ-SAMPLE01",
};

export default function CertificateTemplateForm({ hasTemplate }: { hasTemplate: boolean }) {
  const [state, formAction, pending] = useActionState(saveCertificateTemplate, initialState);
  useActionToast(state, "Certificate template updated.");

  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPreviewHtml(null);
      setFileName(null);
      return;
    }
    setFileName(file.name);
    const html = await file.text();
    setPreviewHtml(renderCertificateHtml(html, SAMPLE_DATA));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Certificate Template</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload an HTML certificate design. It&apos;s rendered to PDF and issued automatically when a
          student completes a course. Supported placeholder tokens:{" "}
          <code className="text-xs">{"{{studentName}}"}</code>,{" "}
          <code className="text-xs">{"{{courseTitle}}"}</code>,{" "}
          <code className="text-xs">{"{{completionDate}}"}</code>,{" "}
          <code className="text-xs">{"{{certificateCode}}"}</code>. If no template is uploaded, a
          plain default certificate is used instead.
        </p>
        <p className="text-sm text-muted-foreground">
          Fonts and images must be embedded directly in the file (base64 data URIs), not linked to an
          external URL (e.g. Google Fonts <code className="text-xs">@import</code>). PDF rendering runs
          in a network-restricted sandbox — an external request that hangs or fails will silently fall
          back to the plain default certificate instead of your template.
        </p>

        {hasTemplate && !fileName && (
          <p className="text-sm text-foreground">A template is currently configured.</p>
        )}

        <form action={formAction} className="flex items-center gap-3">
          <input
            type="file"
            name="templateFile"
            accept=".html,text/html"
            required
            onChange={handleFileChange}
            className="cursor-pointer text-sm text-foreground file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-transparent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Saving..." : "Save Template"}
          </Button>
        </form>

        {previewHtml && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              Preview (sample data — not saved yet)
            </p>
            <iframe
              srcDoc={previewHtml}
              title="Certificate template preview"
              className="h-80 w-full rounded-md border bg-white"
              sandbox=""
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
